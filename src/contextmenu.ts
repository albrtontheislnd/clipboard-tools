import { Menu, MenuItem, Editor, MarkdownView } from "obsidian";

export function registerContextMenu(
    menu: Menu, 
    editor: Editor, 
    view: MarkdownView, 
    handleWrapCallout: (editor: Editor, view: MarkdownView) => Promise<void>, 
    handleChangeCase: (editor: Editor) => Promise<void>,
    handleZhongwen: (editor: Editor, tasks: 'grammar' | 'word-usage-en' | 'word-usage-vi' | 'explain') => Promise<void>
) {
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

        // Add Zhongwen grammar command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Zhongwen: Grammar").setIcon('book')
                .onClick(async () => {
                    await handleZhongwen(editor, 'grammar');
                });
        });

        // Add Zhongwen word usage (English) command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Zhongwen: Word Usage (EN)").setIcon('book-open')
                .onClick(async () => {
                    await handleZhongwen(editor, 'word-usage-en');
                });
        });

        // Add Zhongwen word usage (Vietnamese) command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Zhongwen: Word Usage (VI)").setIcon('book-open')
                .onClick(async () => {
                    await handleZhongwen(editor, 'word-usage-vi');
                });
        });

        // Add Zhongwen explain command
        subMenu.addItem((subItem: MenuItem) => {
            subItem.setTitle("Zhongwen: Explain").setIcon('info')
                .onClick(async () => {
                    await handleZhongwen(editor, 'explain');
                });
        });
    });
}
