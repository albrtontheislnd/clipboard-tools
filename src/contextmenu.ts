import { Menu, MenuItem, Editor, MarkdownView } from "obsidian";

export function registerContextMenu(menu: Menu, editor: Editor, view: MarkdownView, handleWrapCallout: (editor: Editor, view: MarkdownView) => Promise<void>, handleChangeCase: (editor: Editor) => Promise<void>) {
    // Add a main menu item with submenu
    let subMenu: Menu;
    menu.addItem((item: MenuItem) => {
        item.setTitle('Alapaki: More...').setIcon('pencil')
        subMenu = (item as MenuItem & { setSubmenu(): Menu }).setSubmenu();

        if (!subMenu) return;

        // Add the change case command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Change Case").setIcon('case-sensitive')
                .onClick(async () => {
                    await handleChangeCase(editor);
                });
        });

        // Add the wrap callout command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Wrap as Callout").setIcon('wrap-text')
                .onClick(async () => {
                    await handleWrapCallout(editor, view);
                });
        });

        subMenu.addSeparator();

        // Add the main selection command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("TBD").onClick(() => {
                // empty for later
            });
        });

        // Add the main selection command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("TBD 2").onClick(() => {
                // empty for later
            });
        });
    });
}
