# Stage 01 — Project Brief

## Project identity

NIVASafe is a bilingual, multi-organization HSE platform. This change extends the FMEA assessment flow with structured process information and human-confirmed AI assistance.

## Objective

Capture the job/process context needed before risk rows are entered, while keeping catalog and AI output advisory until the assessor explicitly confirms it.

## Actors and journey

Assessors and permitted organization users choose a project, search the active job catalog, review related equipment/material/control suggestions, optionally request bounded activity-description assistance that writes directly into the editable field, confirm or add items, and continue to the risk-row step. Organization scope and permissions remain enforced by the authenticated API.

## Scope

In scope: searchable/custom job selection, global/organization visibility, persisted FMEA process fields, database and AI suggestions, explicit selection/add-new controls, bounded one/two-sentence description assistance with direct editable-field insertion, locale-aware UI, autosaved drafts and report metadata. Out of scope: unauthenticated catalog administration.

## Assumptions and risks

The existing server-side AI provider configuration remains authoritative for risk requests. AI availability is degraded safely to catalog suggestions and deterministic description guidance. A clean local migration could not be executed because MySQL was unavailable on `127.0.0.1:3306`; this remains a separate validation dependency. The current project-creation change is additive and required no production migration.

## Handoff

The UI must preserve RTL/LTR behavior, required-field clarity and explicit user confirmation. Backend and database layers must validate tenant ownership and retain backward compatibility for existing FMEA rows.

## Incremental multi-company scope

The account model supports multiple independent organizations per user. Each organization receives its own membership set, settings, projects and assessment data, plus an independent subscription state. The authenticated shell lets users switch only among server-returned memberships; in production, a newly created organization remains available for billing but operational routes stay blocked until that organization's subscription is paid and usable. This scope preserves the existing monolithic frontend/API/database structure and does not introduce a separate service.
