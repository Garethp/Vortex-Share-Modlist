import { Mod } from "./index";

export type Transformer = (mods: Mod[]) => string;

export const textTransformer = (mods: Mod[]): string => {
  return mods
    .map(
      (mod) =>
        `${mod.name}\n------\nEnabled: ${
          mod.enabled ? "Yes" : "No"
        }\nVersion: ${mod.version}\nMod Page: ${mod.homepage}\n`
    )
    .join("\n\n");
};

export const htmlTransformer = (mods: Mod[]): string => {
  return `
<html lang="en">
<head>
    <title>Vortex Modlist</title>
    <style>
        body {
            font-family: Open Sans, Arial,serif;
            color: #454545;
            font-size: 16px;
            margin: 2em auto;
            max-width: 800px;
            padding: 1em;
            line-height: 1.4;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            hyphens: auto
        }

        a {
            color: #07a
        }

        a:visited {
            color: #941352
        }

        body {
            font-family: sans-serif;
        }
    </style>
</head>
<body>
<main>
    ${mods.map(transformModToHtml).join("\n<br />\n")}
</main>
</body>
</html>`;
};

const transformModToHtml = (mod: Mod): string => {
  let output = `<h2>${mod.name}</h2>`;
  if (mod.version) {
    output += `<b>Version:</b> ${mod.version}<br />`;
  }

  if (mod.homepage) {
    output += `<b>Homepage:</b> <a href="${mod.homepage}">${mod.homepage}</a>`;
  }

  return `<div>${output}</div>`;
};
