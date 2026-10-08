# RULA main-factor typography

Factor titles and source captions previously rendered as adjacent inline elements, visually joining the bold name to the smaller source text in RTL. The existing text wrapper now uses a two-row grid with an explicit gap; both title and caption are block elements with consistent line height and natural start alignment. Slightly larger caption text uses the report's muted color token. Shrinkable containers and wrapping prevent long captions from colliding with icons or overflowing narrow cards. Source labels, factor scores and workflow logic remain unchanged.

Frontend regression tests check the stacked layout, font hierarchy, wrapping and preservation of non-AI captions. Live browser visual QA is NOT_RUN. No API, database, permissions, dependencies or unsafe text rendering changes. Build/test results are recorded in project-state.json. Git push and production deployment are NOT_PERFORMED in this task.
