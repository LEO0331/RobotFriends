# Infrastructure regional focus UX

The Infrastructure map has two explicit states.

## National overview

- `region=All regions` keeps the approved national pipeline visual.
- A region switcher is always available below the visual.
- Choosing Arizona, Texas, Ohio or Northern Virginia writes the region into the existing hash route and keeps browser back/forward behavior.

## Regional focus

Selecting a region preserves the surrounding Infrastructure page but replaces the national map area with a focused analytical view:

- selected-region marker is emphasized while the other tracked hubs stay dim for geographic context;
- grid/operator, current pipeline stage and constraint are shown together;
- secured power is expressed as a percentage of planned pipeline using the same curated capacity values already shown in the region detail panel;
- a four-stage pipeline timeline highlights the selected region's current stage;
- a short regional read explains the decision variable without adding a buy/sell recommendation;
- other region markers and the region switcher remain interactive, so comparison takes one click;
- `All regions` restores the original national pipeline graphic.

The focus view is explicitly labelled as curated demo context. It does not introduce new live-source claims; it reorganizes the existing demo capacity/constraint state into a more useful selected-region interaction.
