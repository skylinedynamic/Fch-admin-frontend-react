---
name: fch-funding-credit
description: Specialized domain guidelines for Capital Access, Credit Builder, Pre-Qualification, and Fund Application modules across the FCH platform. Use when working on funding applications, credit accounts, pre-flight checklists, strategy roadmaps, or borrower onboarding.
---

# Capital Access, Credit Builder & Funding Applications

## 1. Capital Access Strategy
- Manages borrower capital strategies (Pre-Flight Checklists, Strategy Roadmaps, Play Overviews, Step Details, Completion).
- User Strategy Guards (`CapitalAccessStrategyGuard`) validate access against recommended borrower plays.

## 2. Credit Builder Module
- Tracks business vendor credit building accounts (Tier 1, Tier 2, Tier 3 vendors).
- Vendor application workflows, progress tracking, and educational credit building guides.

## 3. Fund Application & Pre-Qualification Wizards
- Multi-step stateful wizard forms:
  - Personal Information Step
  - Business Information Step
  - Financial Information Step
  - Ownership Information Step (with Co-Borrower Modal)
  - Funding Needs Step
