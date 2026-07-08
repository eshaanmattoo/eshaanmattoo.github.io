---
title: From Manual Commands to an Autonomous Rover Stack
date: 2026-07-08
---

# From Manual Commands to an Autonomous Rover Stack

The earliest useful version of a rover system is rarely glamorous. It is usually a direct command, a serial print, a motor that twitches, and a builder trying to understand whether the problem is code, wiring, power, timing, or the assumption they forgot they were making.

That stage matters. Manual testing is where the system starts telling the truth.

## The first layer: direct control

Before autonomy, I needed confidence in movement. That meant building small utilities for motors, servos, flippers, serial commands, and SSH workflows. Each tool answered a narrow question:

- Can this actuator move on command?
- Does the controller receive the packet I think I sent?
- Are the left and right sides behaving symmetrically?
- Can I reproduce the same movement tomorrow?



## The second layer: controller boundaries

As the rover grew, the architecture needed clearer responsibility. Command routing, sensor handling, actuator movement, and host-side mission logic could not all be treated as one vague blob.

Splitting responsibilities made the system easier to reason about. The host could focus on intent and sequencing. Controllers could focus on timing, pins, and hardware behavior. Packet helpers became the shared language between those layers.

## The third layer: missions

Mission files changed the work from "try this command" to "run this repeatable behavior." JSON routes, fixed missions, calibration values, and pickup-style tests made it easier to preserve an experiment and rerun it with small changes.

That is the bridge from manual movement to autonomy: not magic, but repeatability.
