export async function applyTheme(themeName: string) {
    document.documentElement.setAttribute('data-theme', themeName);

    const oldLink = document.getElementById("theme-stylesheet");
    if (oldLink) oldLink.remove();

    const link = document.createElement("link");
    link.id = "theme-stylesheet";
    link.rel = "stylesheet";
    link.href = `/themes/${themeName}.css`;

    document.head.appendChild(link);
}