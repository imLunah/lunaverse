# TODOS

## Design debt

- [ ] **Mobile in-scene content treatment** (deferred 2026-07-12, decision 6C in docs/design-plan.md)
  - **What:** Design + build the under-700px behavior for in-scene content — likely: camera still zooms, content appears as a bottom-sheet DOM card (readable type, 44px touch targets); portrait camera home position pulls back to frame the whole room.
  - **Why:** Content lives on 3D surfaces (laptop screen, photo frame). On a 375px phone those surfaces are stamp-sized; text becomes unreadable. Portfolio links are opened from messages on phones more than desktops.
  - **Pros:** Site works for its most common visitor.
  - **Cons:** Extra content-rendering path to keep in sync with the in-scene surfaces.
  - **Context:** John chose desktop-first on 2026-07-12 to keep scope lean while the look and click choreography land. The DOM mirror built for screen readers (task T5) is a natural starting point for the mobile card.
  - **Depends on:** T2 (in-scene content surfaces) landing first.
