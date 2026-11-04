# Shared stage lighting controls

Hosts can configure three light types (sweeping beams, spots, wash), five palettes, four sweep speeds including static, four pulse modes including off, and brightness from 20 to 100%. The isolated preview updates immediately; Apply persists settings to the existing stage JSON through the host-authorized stage API. Polling delivers the same configuration to other viewers. No database column, service, dependency or secret is added.

Older room snapshots use the existing violet/teal, slow sweep and no-pulse default. Device reduced-motion preferences override both sweep and pulse animations. Pulse uses a gentle opacity envelope with bounded periods; it does not use high-frequency strobe effects. Editing/saving lighting does not change playback timestamps or remount the player.

Validation: schema/default/serialization tests, locale placeholder tests; browser fixtures at 1024px and 320px verify preset selection, isolated preview, Apply, Discard and reduced-motion overrides without horizontal overflow. Temporary fixtures are removed before production build. HTTP integration verifies host-only updates, invalid-settings rejection, delivery through the guest snapshot and unchanged playback timestamps.
