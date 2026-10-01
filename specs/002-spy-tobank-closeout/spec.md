# Feature Specification: Spy Tobank Closeout

**Feature Branch**: `spy-tobank/step-4-panels`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Finish the Spy Tobank reshaping of the debugging product. Saved work through the shell must stay. Unsaved panel, device, and recordings work must not be discarded. The page must stay responsive when the on-device connection dialog opens. Recordings are manual only: clear logs, generate logs, upload with a note, see the recording in the panel, open its timeline, and download it. If no retention period is set, keep recordings for 7 days and then delete them. Finish with a quality pass: readable contrast, 44px touch targets, 16px phone text entry, one shared palette, no unused leftovers, no source-host link on the error screen, checks at 360px, 768px, and desktop, and a live device usable from the panel and from the device. Locked decisions stay locked."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Page stays usable while the connection dialog is open (Priority: P1)

A person on the device opens the connection dialog that starts a debugging session. The rest of the page keeps responding. They can still scroll, tap, and type. The dialog does not lock the page.

**Why this priority**: A frozen page blocks every other check, including recordings and a live device session.

**Independent Test**: On the device, open the connection dialog and immediately scroll the page and tap a control outside the dialog. The page moves and the tap registers.

**Acceptance Scenarios**:

1. **Given** the device page is open, **When** the connection dialog opens, **Then** the page still scrolls and accepts taps and typing within one second.
2. **Given** the connection dialog is open while new logs arrive, **When** the person scrolls the page, **Then** the page keeps moving and does not become stuck.
3. **Given** the connection dialog is dismissed, **When** the person continues on the page, **Then** the page behaves as it did before the dialog opened.

---

### User Story 2 - Save a manual recording and review it (Priority: P1)

A person debugging a session chooses to keep the logs. They clear what is on screen, generate fresh logs, upload them with a note, find that recording in the panel, open its timeline, and download it. Nothing is saved as a recording unless they upload it.

**Why this priority**: This is the remaining end-to-end recordings journey. Automatic capture is out of the product.

**Independent Test**: Clear logs, generate logs, upload with a note, confirm the recording is listed, open the timeline, and download the file.

**Acceptance Scenarios**:

1. **Given** a session with existing logs, **When** the person clears logs, **Then** the visible log list is empty and no recording is created.
2. **Given** a cleared session, **When** the person generates new logs and uploads them with a note, **Then** a recording with that note appears in the recordings panel.
3. **Given** a recording in the panel, **When** the person opens it, **Then** they see a timeline of the uploaded logs.
4. **Given** an open recording timeline, **When** the person downloads it, **Then** they receive the recording.
5. **Given** a live session that the person never uploads, **When** they leave the session, **Then** no recording was created.

---

### User Story 3 - Closeout quality on phone, tablet, and desktop (Priority: P2)

A person uses the finished product on a narrow phone, a tablet width, and a desktop. Text is readable on the dark background, controls are easy to tap, phone text fields do not zoom the page, the error screen does not send them to a source host, and a live device can be inspected from the panel and from the device.

**Why this priority**: The freeze fix and recordings journey deliver the feature. This pass confirms the locked product shape still holds and the release is fit to use.

**Independent Test**: Walk the main flows at 360px width, at 768px width, and on a desktop width, with one live device connected, and review contrast, touch size, phone text size, palette consistency, leftovers, and the error screen.

**Acceptance Scenarios**:

1. **Given** a phone-width screen (360px), **When** the person uses the main debugging views, **Then** a top bar and bottom tabs are present, detail opens as a bottom sheet, touch controls are at least 44px, and text fields use at least 16px type.
2. **Given** a desktop-width screen, **When** the person uses the same views, **Then** navigation is a left menu and detail opens in a side pane.
3. **Given** a 768px-wide screen, **When** the main views load, **Then** content fits the width without a horizontal blowout of the page.
4. **Given** the shared dark palette and its violet accent, **When** text and controls are shown on their backgrounds, **Then** contrast meets WCAG 2.2 AA.
5. **Given** the error screen, **When** it is shown, **Then** it does not offer a link to the source host.
6. **Given** a live device, **When** the person inspects it from the debugging panel and from the device itself, **Then** both sides work in the same session.
7. **Given** the main debugging panel and the device, **When** the person looks for Page and Element inspection, **Then** those views exist only on the main panel.

### Edge Cases

- What happens when the connection dialog opens while logs are still arriving? The page stays responsive.
- What happens when upload is attempted with an empty note? Upload does not proceed, the person is told a note is required, and no recording is created.
- What happens when upload fails because the connection drops? No recording appears in the panel, the local logs remain, and the person can try again.
- What happens when logs are cleared and there was nothing to clear? The empty state stays, with no error and no recording.
- What happens when a recording is older than the default 7 days? It is no longer listed and cannot be downloaded.
- What happens when someone tries to download a recording whose stored content is already gone? They see a clear failure message, not a broken file.
- What happens when two manual uploads are made in one session? Both recordings appear, each with its own note and timeline.
- What happens on a 360px screen when a bottom sheet is open? The person can still dismiss it and reach the primary navigation.
- What happens when a phone text field is focused? The page does not zoom.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Opening the on-device connection dialog MUST leave the page responsive to scrolling, tapping, and typing. The page MUST NOT freeze.
- **FR-002**: Recordings MUST be created only when a person uploads logs. The product MUST NOT create recordings on its own.
- **FR-003**: A person MUST be able to clear the current logs, generate new logs, and upload those logs together with a note.
- **FR-004**: A recording upload without a note MUST be refused, with a clear explanation, and MUST NOT create a recording.
- **FR-005**: After a successful upload, the recording MUST appear in the recordings panel, identified by its note.
- **FR-006**: Opening a recording MUST show a timeline of the uploaded logs.
- **FR-007**: A person MUST be able to download a recording that is still retained.
- **FR-008**: When no custom retention period is configured, a recording MUST be kept for 7 days from its creation and then removed automatically. It MUST NOT remain listed or downloadable after that.
- **FR-009**: On phone widths, the product MUST show a top bar and bottom tabs. Detail MUST open as a bottom sheet. On desktop widths, navigation MUST be a left menu and detail MUST open in a side pane.
- **FR-010**: Page inspection and Element inspection MUST be available on the main debugging panel only. They MUST NOT be offered on the device.
- **FR-011**: The product MUST be in English only, with one dark theme and one violet accent.
- **FR-012**: Text on its background, and controls on their backgrounds, MUST meet WCAG 2.2 AA contrast (4.5:1 for normal text, 3:1 for large text and interface parts).
- **FR-013**: Touch controls MUST provide at least a 44px target. Text fields used on a phone MUST use at least 16px type so focusing them does not zoom the page.
- **FR-014**: Colors MUST come from the shared palette only. One-off colors outside that palette MUST NOT remain.
- **FR-015**: Unused libraries, leftover files, unused icons, and unused translation strings MUST NOT remain.
- **FR-016**: The error screen MUST NOT include a link to the source host.
- **FR-017**: The main flows MUST be usable at 360px width, at 768px width, and on a desktop width, without the page blowing out horizontally.
- **FR-018**: A live device MUST be usable from the debugging panel and from the device in the same session.
- **FR-019**: Sites that already embed the debugger MUST keep working at the same script address and with the same connection behavior.
- **FR-020**: A failed upload MUST leave existing local logs in place and MUST NOT add a recording to the panel.

### Key Entities

- **Recording**: A manual snapshot of logs. It has a required note, a timeline of those logs, a creation time, and an expiry. With no custom retention, expiry is 7 days after creation.
- **Connection dialog**: The on-device dialog used to start a debugging session. Opening it must not stop the page from responding.
- **Device session**: One live device inspected from the debugging panel and from the device itself.
- **Shared palette**: The single dark color set and single violet accent used for every screen. Text and control contrast is judged on pairs from this palette.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With the on-device connection dialog open, a person can scroll and complete a tap within 1 second. The page does not freeze in 10 consecutive openings.
- **SC-002**: A person can finish this path in one session: clear logs, generate logs, upload with a note, see the recording in the panel, open the timeline, and download it.
- **SC-003**: A recording with no custom retention is still available before 7 days and is gone from the list and from download after 7 days.
- **SC-004**: At 360px, 768px, and a desktop width, the main layout does not blow out horizontally. Touch controls measure at least 44px. Phone text fields measure at least 16px.
- **SC-005**: Every shared-palette pair used for text or controls meets WCAG 2.2 AA (4.5:1 normal text, 3:1 large text and interface parts).
- **SC-006**: The error screen shows no source-host link. The interface is English, dark, and uses a single violet accent.
- **SC-007**: One live device can be used from the debugging panel and from the device in the same session. Page and Element inspection appear only on the main panel.
- **SC-008**: Release preparation reports zero type errors and produces a completed production package.
- **SC-009**: A review finds no unused libraries, leftover files, unused icons, unused translation strings, or colors outside the shared palette.

## Assumptions

- "Auto delete if missing" means: when no custom retention period is configured, use 7 days and then delete. A custom retention control is not part of this closeout.
- A note is required and must not be blank. Empty-note uploads are refused.
- "Generate logs" means the person can produce new log activity after a clear, then upload that activity.
- A freeze means the page stops accepting scroll, taps, or typing. A short visual pause that still accepts input is not a freeze.
- Phone layout applies at 360px width. The 768px width must not blow out. Desktop means wider than 768px and uses the left menu and side pane.
- WCAG level is 2.2 AA, as above. AAA is not required.
- Locked product decisions are not reopened: landing and docs are gone, the old component library and its style language are gone, and the product is English only. Page and Element inspection stay on the main panel only. Recordings stay manual only. Phone uses a top bar and bottom tabs. Desktop uses a left menu. Detail is a bottom sheet on phones and a side pane on desktop. One dark theme and one violet accent. The public script address `page-spy/index.min.js` and the existing connection behavior stay as they are.
- The plan documents `/mnt/project-files/spy-tobank-plan.md` and `/mnt/project-files/ui-ux-issues.md` could not be read. Removals named only in those files are not redesigned here.
- Saved work already covers cleanup, the shared palette, and the shell: `spy-tobank/step-1-cleanup` (`a1fd589`), `spy-tobank/step-2-tokens` (`ead3b0e`), and `spy-tobank/step-3-shell` (`c888250`). The current git branch is `spy-tobank/step-4-panels`, which points at the same saved commit as step 3 (`c888250`). Panel, device, and recordings work is only unsaved edits on that branch (modified and deleted tracked files, plus new recordings, panel, and related files). That unsaved work MUST be kept. This specification did not create or switch a git branch.
- The earlier specification `specs/001-shadcn-mobile-refactor` does not cover this closeout. It is left unchanged.
- Release preparation is the project's existing type check and production package. This closeout does not change that process, only requires both to succeed.
