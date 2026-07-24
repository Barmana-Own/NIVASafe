# Testing

`pnpm test` runs pure domain tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` validate all workspaces. Domain coverage includes RPN boundaries, risk classification and bounded/traceable RULA calculation. Integration UAT requires MySQL. Docker checks require Docker Engine, which is not available in every development host.
