# RxSync — Prescription Synchronization Tool

A browser-based tool for pharmacies to synchronize a patient's prescriptions onto a single pickup date.

## What it does

Given a set of prescriptions with different fill dates and days supplies, RxSync calculates the short (bridge) fills needed to align all medications to a common sync date. Once synced, every prescription is filled together on the same day each cycle.

## How to use

1. Set today's date, buffer period, and standard days supply in the Settings panel
2. Add each prescription — enter the drug name, last fill date or pills remaining, and days supply
3. Click **Calculate Sync** to generate the fill plan
4. Review the pickup schedule and visual timeline
5. Click **Print** to hand the plan to the patient

## Features

- Bridge fill calculation with configurable buffer period
- Per-medication toggles: never fill early, fixed days supply
- Visual timeline showing current and upcoming fill periods
- Chronological pickup schedule grouped by date
- Export and import session data as a portable string
- Print-friendly patient handout

## Running locally

- Available via GitHub Pages.

Note: This tool is tailored for viewing on a desktop browser, with print view included. Its layout is not responsive on mobile.
