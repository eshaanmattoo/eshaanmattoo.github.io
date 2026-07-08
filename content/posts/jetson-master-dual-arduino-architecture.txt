---
title: Jetson Master and Dual Arduino Slave Architecture
date: 2026-07-08
---

# Jetson Master and Dual Arduino Slave Architecture

This rover architecture separates the brain, actuator control, and sensor feedback into three clear roles. The Jetson acts as the master coordinator. One Arduino Mega acts as the command slave for motors, flippers, and arm servos. A second Arduino Mega acts as the sensor slave for encoder and IMU feedback.

The word slave here describes responsibility inside the system, not an I2C slave relationship. Both Arduino boards are independent USB serial devices connected to the Jetson. The Jetson owns the high-level intent, timing, state display, and future autonomy decisions. The Arduinos stay close to the hardware and do deterministic jobs.

![Jetson master and dual Arduino slave architecture](assets/images/post-jetson-dual-architecture.svg)

## Design Goal

The main design goal is to make the rover easier to reason about under field conditions. A single controller can work for small tests, but it becomes harder to debug when movement, servos, encoders, IMU reads, command parsing, and user interaction all compete in the same loop.

This split creates two clean planes:

- The command plane sends intent from the Jetson to the Command Mega.
- The telemetry plane streams feedback from the Sensor Arduino to the Jetson.
- The Jetson merges both streams into shared state for the CLI, GUI, logs, and mission logic.

That separation is the real strength of the architecture. If the rover does not move, the command plane can be inspected. If the rover moves but the state looks wrong, the telemetry plane can be inspected. If both are healthy, the higher-level behavior can be debugged with much less uncertainty.

## System Responsibilities

| Layer | Component | Responsibility | Main files |
| --- | --- | --- | --- |
| Operator layer | Laptop over SSH | Sends keyboard or GUI intent to the Jetson | SSH terminal or display |
| Master layer | Jetson | Runs CLI/GUI, creates command packets, reads ACKs, reads telemetry, stores shared state | `jetson_dual_cli.py`, `jetson_dual_gui.py`, `rover_packets.py` |
| Actuator slave | Command Mega | Parses command packets, drives left/right motors, smooths flipper and arm servos, returns ACK packets | `command_mega/command_mega.ino` |
| Sensor slave | Sensor Arduino | Reads encoders and BNO8x IMU, packs telemetry, streams sensor packets at 50 Hz | `sensor_arduino/sensor_arduino.ino` |
| Hardware layer | Rover platform | Motor driver, flippers, arm servos, rear encoders, IMU, power, shared ground | Wiring and pinout docs |

## High-Level Architecture

The laptop is not directly controlling the Arduinos. It connects to the Jetson over SSH. The Jetson then opens two serial ports:

- `cmd-port`, usually something like `/dev/ttyACM0`, talks to the Command Mega.
- `sensor-port`, usually something like `/dev/ttyACM1`, reads the Sensor Arduino.

The Command Mega is write-heavy from the Jetson perspective. The Jetson sends drive, servo, stop, and ping packets. The Mega validates them, applies the hardware action, and returns a short ACK.

The Sensor Arduino is read-heavy from the Jetson perspective. It continuously streams binary sensor packets. The Jetson does not need to ask for every reading; it simply consumes the latest packet and displays or uses it.

## Runtime Data Flow

![Control and telemetry data flow](assets/images/diagram-jetson-dual-dataflow.svg)

At runtime, the Jetson has three jobs happening together:

- Convert operator input into drive or servo intent.
- Keep the command stream alive at the configured send rate while movement is active.
- Continuously read ACK and sensor packets into shared state.

The CLI uses a `SharedState` object to hold the latest PWM, servo angles, selected servo, drive intent, latest ACK, latest sensor packet, packet counts, CRC error counts, and status message. That state is updated by the main keyboard loop plus two background reader threads.

This is why the interface can show movement intent, ACK health, yaw, pitch, roll, encoder ticks, and packet counts at the same time.

## Command Plane

The command plane is Jetson to Command Mega. It uses fixed-length 10-byte packets beginning with `0xAA`. The packet is small enough to send repeatedly at 50 Hz while the rover is driving.

| Type | Value | Meaning |
| --- | --- | --- |
| `TYPE_DRIVE` | `0x01` | Set left and right motor PWM plus direction |
| `TYPE_SERVO_RAW` | `0x02` | Set one servo target angle |
| `TYPE_STOPALL` | `0x03` | Stop all motors immediately |
| `TYPE_PING` | `0x04` | Confirm the Command Mega is alive |

Direction values are deliberately simple:

| Direction | Value |
| --- | --- |
| `STOP` | `0x00` |
| `FWD` | `0x01` |
| `REV` | `0x02` |

Servo IDs are also stable:

| ID | Servo |
| --- | --- |
| `0` | FL flipper |
| `1` | FR flipper |
| `2` | BL flipper |
| `3` | BR flipper |
| `4` | S1 arm servo |
| `5` | S2 arm servo |
| `6` | S3 arm servo |
| `7` | S4 arm servo |
| `8` | S5 arm servo |

The Command Mega does not just blindly trust packets. It checks framing, packet length, type, direction values, servo ID, and CRC. A bad CRC stops the motors and returns an ACK error.

## Packet Layouts

![Binary packet layout diagram](assets/images/diagram-jetson-dual-packets.svg)

The binary protocol has three fixed packet shapes.

| Packet | Direction | Length | SOF | Purpose |
| --- | --- | --- | --- | --- |
| Command | Jetson to Command Mega | 10 bytes | `0xAA` | Drive, servo, stop, ping |
| ACK | Command Mega to Jetson | 5 bytes | `0xAC` | Echo type and sequence with status |
| Sensor | Sensor Arduino to Jetson | 20 bytes | `0xBB` | Encoder, IMU, timestamp, status |

All three use CRC-8/ATM with polynomial `0x07`, initial value `0x00`, and no reflection. The start-of-frame byte lets the parser resync. The sequence byte lets the Jetson associate a command with the ACK that came back.

## ACK Plane

Every valid command type produces an ACK packet from the Command Mega.

| ACK status | Value | Meaning |
| --- | --- | --- |
| `ACK_OK` | `0` | Packet accepted |
| `ACK_CRC_ERROR` | `1` | CRC mismatch |
| `ACK_BAD_TYPE` | `2` | Unknown packet type |
| `ACK_BAD_DIR` | `3` | Invalid motor direction |
| `ACK_BAD_SERVO` | `4` | Invalid servo ID or angle |

The ACK packet is intentionally tiny:

```text
[0] SOF 0xAC
[1] echoed packet TYPE
[2] echoed SEQ
[3] status
[4] CRC8 over bytes 1-3
```

This lets the Jetson keep a live health view without making the Mega responsible for high-level decisions.

## Sensor Plane

The sensor plane is Sensor Arduino to Jetson. It streams at 50 Hz, which matches the command update rhythm and gives the Jetson a fresh enough state view for manual driving, bench testing, and future closed-loop movement.

The 20-byte sensor packet is:

| Byte range | Field | Encoding |
| --- | --- | --- |
| `0` | SOF | `0xBB` |
| `1` | TYPE | `0x10` |
| `2` | SEQ | `0-255` rolling sequence |
| `3-4` | left encoder ticks | signed `int16`, big endian |
| `5-6` | right encoder ticks | signed `int16`, big endian |
| `7-8` | yaw | signed `int16`, degrees multiplied by 16 |
| `9-10` | pitch | signed `int16`, degrees multiplied by 16 |
| `11-12` | roll | signed `int16`, degrees multiplied by 16 |
| `13-16` | timestamp | `millis()` as `uint32`, big endian |
| `17` | status | sensor health flags |
| `18` | reserved | currently `0` |
| `19` | CRC | CRC8 over bytes `1-18` |

The BNO8x is read over I2C using the `Adafruit_BNO08x` library. The firmware enables the rotation vector report at 20 ms intervals, then converts the quaternion into yaw, pitch, and roll.

Status flags make the packet more useful than raw numbers alone:

| Status bit | Meaning |
| --- | --- |
| bit 0 | BNO/IMU data is fresh |
| bit 1 | left encoder path is configured |
| bit 2 | right encoder path is configured |
| bit 3 | IMU calibration/accuracy is valid |

One important detail: this 20-byte packet only has two bytes for each encoder count. The implementation sends the low signed 16 bits of the cumulative count. For long autonomous runs, the newer autonomous stack expands the sensor packet to 28 bytes so encoder ticks can be full signed `int32` values.

## Why The Split Works

The Command Mega owns time-sensitive actuator behavior. It can smooth servos at `1 degree / 20 ms`, enforce servo limits, handle motor direction changes carefully, and stop motors if drive packets stop arriving.

The Sensor Arduino owns continuous feedback. It can spend its loop reading encoders and IMU data without worrying about servo timing or motor writes.

The Jetson owns coordination. It has enough compute for CLI/GUI interfaces, route logic, perception experiments, mission files, and logs. It also has the best view of the full system because it receives both command ACKs and sensor telemetry.

This gives the system a useful failure boundary:

- If ACKs stop, the command link or Command Mega is suspect.
- If sensor packets stop, the sensor link or Sensor Arduino is suspect.
- If ACKs and sensors are healthy but behavior is wrong, the issue is likely intent, calibration, wiring, or mechanical behavior.

## Safety Behaviors

The architecture has several safety-oriented behaviors:

- The Jetson sends drive packets repeatedly only while a key or movement intent is active.
- The CLI has a key deadman timeout that sends `STOPALL` when input stops.
- The Command Mega has a motor watchdog and stops motors if drive packets stop for about `150 ms`.
- A CRC failure on a command packet stops the motors and returns `ACK_CRC_ERROR`.
- Servo angles are clamped on both the Jetson side and the Mega side.
- S4 is constrained to `30-160` to avoid unsafe travel.

This matters because the rover is not just software. It is a physical system with momentum, power draw, and mechanical limits.

## Startup And Testing Sequence

A reliable bring-up sequence makes the architecture much easier to debug:

1. Upload `command_mega.ino` to the Command Mega.
2. Upload `sensor_arduino.ino` to the Sensor Arduino.
3. Confirm each board prints its startup message at `115200` baud.
4. Plug both boards into the Jetson.
5. List ports with `ls /dev/ttyACM* /dev/ttyUSB*`.
6. Run the Jetson CLI with explicit ports.
7. Confirm sensor packet count increases and `sensor_bad` stays near zero.
8. Press `p` and confirm ACK count increases with status `0`.
9. Bench-test servos before driving motors.
10. Lift the rover for the first motor test.

The field command looks like this:

```bash
python3 jetson_dual_cli.py --cmd-port /dev/ttyACM0 --sensor-port /dev/ttyACM1 --pwm 60 --sync-servos-on-start
```

The low PWM start is intentional. The goal of the first run is not speed. The goal is proving the data path, command path, and mechanical response.

## Pinout Snapshot

Command Mega actuator pins:

| Function | Pin |
| --- | --- |
| M1 / left PWM | `6` |
| M1 / left DIR | `4` |
| M2 / right PWM | `5` |
| M2 / right DIR | `13` |
| FL flipper servo | `10` |
| FR flipper servo | `11` |
| BL flipper servo | `3` in current firmware |
| BR flipper servo | `9` in current firmware |
| S1-S4 arm servos | `A0-A3` |
| S5 arm servo | `A5` in current firmware |

Sensor Arduino pins:

| Function | Pin |
| --- | --- |
| Left encoder A | `2` |
| Left encoder B | `4` |
| Right encoder A | `3` |
| Right encoder B | `5` |
| BNO8x SDA | board SDA |
| BNO8x SCL | board SCL |

All grounds must be common: Jetson USB ground, Command Mega ground, Sensor Arduino ground, motor driver ground, servo regulator ground, encoder ground, and IMU ground.

## How This Extends To Autonomy

This architecture is a good base for autonomy because the Jetson already has the right role. A mission runner can replace keyboard input without changing the Command Mega firmware. Vision alignment can produce turn or drive intents without changing the sensor stream. Calibration can live in JSON on the Jetson while the Arduinos remain predictable hardware adapters.

The future autonomy loop looks like this:

- Read the latest sensor packet.
- Compare current pose, yaw, ticks, or object alignment against the mission target.
- Generate a drive or servo command.
- Send command packet to the Command Mega.
- Watch ACK status and sensor response.
- Log the result for debugging.

That is the same architecture, just with a smarter intent source.

## Lessons From The Architecture

The most important lesson is that reliability comes from clean boundaries. The Jetson should not toggle every pin directly. The Arduinos should not decide the full mission. The command board should not be responsible for IMU fusion. The sensor board should not be responsible for motor safety.

Each board has one job it can do well:

- Jetson: decide and coordinate.
- Command Mega: actuate safely.
- Sensor Arduino: measure continuously.

That separation turns a complicated rover into a system that can be tested one plane at a time. It is also what makes the project easier to explain, document, and grow.
