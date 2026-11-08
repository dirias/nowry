# The phone's golden path (QA-024)

`golden-path.yaml` is a [Maestro](https://maestro.mobile.dev) flow: a stranger opens the app, creates an
account, reaches Home, makes a first deck, and deletes the account again from Settings. It runs on the
Android emulator against whatever API the dev client is pointed at (`mobile/.env`), so it is a local
run, not a CI job: CI has no emulator.

## Once

Install Maestro (Java 17+ is required; the installer puts it in `~/.maestro/bin` and adds that to your
shell's PATH):

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

## Each run

1. Boot the emulator and start Metro (`npm start` in `mobile/`), then open the dev client on the emulator
   from Metro, as for any development session.
2. The dev API keeps the beta gate on, so the flow needs an invite code:

```bash
npm run e2e --workspace=nowry-mobile -- -e INVITE=<your invite code>
```

The flow makes its own throwaway account (`e2e-<suffix>@example.com`) and deletes it at the end, so it
leaves nothing behind. Every tap is on the label a screen reader hears, which is why it breaks when a
string a user depends on changes: that is the point.
