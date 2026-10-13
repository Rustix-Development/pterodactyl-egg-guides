# Contributing

Thanks for wanting to help. Every guide here saves someone a support ticket or a confused evening, so even a small fix is worth sending.

You can contribute in a few ways:

- **Fix a guide.** Open the file on GitHub, click the pencil icon, make your change and propose it. GitHub creates the pull request for you.
- **Write a new guide** for a game that already has a folder.
- **Add a new game** with its own folder.
- **Ask for a guide** or **report a wrong one** by opening an issue. No code needed.

## Adding a game folder

Create a folder named after the game, in lowercase with only letters, numbers and dashes (for example `rust`, `minecraft`, `project-zomboid`). Put a `match.json` in it so the panel knows which servers it belongs to:

```json
{
  "name": "Rust",
  "tags": ["rust"],
  "eggs": ["Rust"],
  "images": ["ghcr.io/pterodactyl/games:rust"]
}
```

- `name` is required. It is the label shown in the panel.
- `tags` are egg tags. A server matches if its egg has any of these tags. This is the preferred way to match.
- `eggs` are egg names, matched exactly (case does not matter). Use the names from the official eggs where possible.
- `images` are Docker image prefixes. A server matches if its image starts with one of these. Only use an image that belongs to this one game, not a shared Java or Wine image.

Panel admins can also pin an egg to a folder by hand, so you do not need to cover every custom egg.

### Frameworks

If the game can run with a mod framework (Oxide or Carbon on Rust, Paper on Minecraft), add a `framework` block:

```json
"framework": {
  "variable": "FRAMEWORK",
  "values": { "oxide": "Oxide", "carbon": "Carbon" }
}
```

- `variable` is the egg's startup variable that holds the framework. Leave it out if the egg has no such variable.
- `values` maps each framework key to the label shown in the panel. An egg tag equal to one of these keys also selects that framework, so a host can tag a Paper egg `paper`.

An empty value, a value not in the list, or `vanilla` means the server runs vanilla.

## Writing a guide

Copy [`_template/guide.md`](_template/guide.md) into the game folder and rename it. File names are lowercase with letters, numbers and dashes, for example `install-plugins.md`.

Every guide starts with a header (called front matter):

```markdown
---
title: How to install plugins
framework: oxide
order: 40
summary: One short line shown under the title in the list.
---
```

- `title` is required.
- `framework` is optional. Use one of the keys from the folder's `match.json`. Without it, the guide is a general one and shows on every server of that game. With it, the guide only shows when the server runs that framework.
- `order` is optional. Lower numbers show first. The default is 100.
- `summary` is optional but helps people find the right guide.

### Placeholders

The panel fills these in with the server's real details:

| Placeholder | Becomes |
| --- | --- |
| `{{server.name}}` | The server's name |
| `{{server.address}}` | The address players type to connect, for example `play.example.com:28015` |
| `{{server.ip}}` | The IP address only |
| `{{server.port}}` | The game port only |
| `{{server.domain}}` | The server's domain if it has one, otherwise the same as the address |

Use `{{server.address}}` whenever you tell someone how to connect.

### Images

Screenshots are welcome when they really help. Put them in an `images` folder inside the game folder and link them with a relative path:

```markdown
![The Startup tab](images/startup-tab.png)
```

Use PNG, JPG, WebP or GIF, crop them to the part that matters, and keep them small. Do not include anything private, such as IP addresses, passwords or Steam IDs that are not yours.

### Things the panel does not do

- Raw HTML is shown as text, not rendered. Stick to Markdown.
- Links always open in a new tab.

## Style tips

- **Short, numbered steps.** One action per step.
- **Say where things are in the panel.** "Open the Files tab", "Go to Startup".
- **Test it on a real server** before you send it. If you are not sure a command is right, leave it out or say so.
- **Write for the game, not for a host.** No links to your hosting company, discount codes or "contact our support" lines. Hosts can keep their own guides in a separate repo.
- **Plain language.** Many readers are running their first server.
- **Mention version differences** if a step changed between game versions.

## Opening a pull request

1. Fork this repo, or use the pencil icon on GitHub for a quick edit.
2. Make your changes on a new branch.
3. If you can, check your work with `node .github/scripts/validate.mjs` (Node 18 or newer, no install needed). The same check runs automatically on every pull request.
4. Open a pull request and fill in the short template. Tell us which game and egg you tested on.

A maintainer will review it, may suggest a few changes, and merge it. Every panel using the Server Guides extension picks up the change on its next sync.

## Questions

Not sure where something belongs, or stuck on a step? Open an issue and ask. There are no silly questions here.

By contributing, you agree that your work is shared under the [MIT License](LICENSE), and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
