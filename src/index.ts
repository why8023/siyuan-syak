/**
 * 导入所需的模块和组件
 */
import { SYAK } from "@/syak";
import {
    Plugin,                // 思源笔记插件基类
    showMessage,           // 显示消息提示
    confirm,               // 确认对话框
    Dialog,                // 对话框组件
    Menu,                  // 菜单组件
    openTab,               // 打开标签页
    adaptHotkey,           // 适配快捷键
    getFrontend,           // 获取前端类型
    getBackend,            // 获取后端类型
    IModel,                // 模型接口
    Protyle,               // 编辑器组件
    openWindow,            // 打开窗口
    IOperation,            // 操作接口
    Constants,             // 常量
    openMobileFileById,    // 通过ID打开移动端文件
    lockScreen,            // 锁屏
    ICard,                 // 卡片接口
    ICardData              // 卡片数据接口
} from "siyuan";
import "@/index.scss";     // 导入样式文件

// 导入自定义Svelte组件
import HelloExample from "@/hello.svelte";
import SettingExample from "@/setting-example.svelte";

// 导入自定义工具类
import { SettingUtils } from "@/libs/setting-utils";
import { svelteDialog } from "@/libs/dialog";

// 定义常量
const STORAGE_NAME = "menu-config";    // 存储配置的名称
const TAB_TYPE = "custom_tab";         // 自定义标签页类型
const DOCK_TYPE = "dock_tab";          // 自定义停靠栏类型

/**
 * 插件示例类，继承自Plugin基类
 */
export default class PluginSample extends Plugin {

    customTab: () => IModel;                   // 自定义标签页函数
    private isMobile: boolean;                 // 是否为移动端
    private blockIconEventBindThis = this.blockIconEvent.bind(this);  // 绑定this的块图标事件处理函数
    private settingUtils: SettingUtils;        // 设置工具实例
    private syak: SYAK;                        // 思源插件实例

    /**
     * 插件加载时执行的方法
     */
    async onload() {
        // 初始化SYAK
        this.syak = new SYAK("", 680, 8765, "siyuan");
        // 初始化插件数据
        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };
        console.log("loading plugin-sample", this.i18n);

        // 检测当前前端环境
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        
        // 添加自定义图标，SVG格式
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>`);

        // 添加顶部栏图标
        const topBarElement = this.addTopBar({
            icon: "iconFace",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    // 如果顶部栏图标被隐藏，则使用插件栏图标
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            }
        });

        // 添加状态栏图标
        const statusIcon = document.createElement("div");
        statusIcon.className = "toolbar__item ariaLabel";
        statusIcon.setAttribute("aria-label", "删除插件数据");
        statusIcon.innerHTML = '<svg><use xlink:href="#iconTrashcan"></use></svg>';
        statusIcon.addEventListener("click", () => {
            showMessage(`[${this.name}]: ${this.i18n.removedData}`);
        });
        
        this.addStatusBar({
            element: statusIcon
        });

        // 添加命令 - 显示对话框
        this.addCommand({
            langKey: "showDialog",
            hotkey: "⇧⌘O",
            callback: () => {
                this.showDialog();
            },
            fileTreeCallback: (file: any) => {
                console.log(file, "fileTreeCallback");
            },
            editorCallback: (protyle: any) => {
                console.log(protyle, "editorCallback");
            },
            dockCallback: (element: HTMLElement) => {
                console.log(element, "dockCallback");
            },
        });
        
        // 添加命令 - 获取打开的标签页
        this.addCommand({
            langKey: "getTab",
            hotkey: "⇧⌘M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });

        // 添加自定义停靠栏
        this.addDock({
            config: {
                position: "LeftBottom",        // 位置：左下角
                size: { width: 200, height: 0 },
                icon: "iconSaving",
                title: "Custom Dock",
                hotkey: "⌥⌘W",                // 快捷键
            },
            data: {
                text: "This is my custom dock"
            },
            type: DOCK_TYPE,
            resize() {
                console.log(DOCK_TYPE + " resize");
            },
            update() {
                console.log(DOCK_TYPE + " update");
            },
            init: (dock) => {
                // 根据是否为移动端创建不同的HTML结构
                if (this.isMobile) {
                    dock.element.innerHTML = `<div class="toolbar toolbar--border toolbar--dark">
                    <svg class="toolbar__icon"><use xlink:href="#iconEmoji"></use></svg>
                        <div class="toolbar__text">Custom Dock</div>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                } else {
                    dock.element.innerHTML = `<div class="fn__flex-1 fn__flex-column">
                    <div class="block__icons">
                        <div class="block__logo">
                            <svg class="block__logoicon"><use xlink:href="#iconEmoji"></use></svg>
                            Custom Dock
                        </div>
                        <span class="fn__flex-1 fn__space"></span>
                        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Min ${adaptHotkey("⌘W")}"><svg class="block__logoicon"><use xlink:href="#iconMin"></use></svg></span>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                }
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            }
        });

        // 初始化设置工具
        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
        });
        
        // 添加文本输入设置项
        this.settingUtils.addItem({
            key: "Input",
            value: "",
            type: "textinput",
            title: "Readonly text",
            description: "Input description",
            action: {
                // 当失去焦点且内容变化时调用
                callback: () => {
                    // 获取数据并实时保存
                    let value = this.settingUtils.takeAndSave("Input");
                    console.log(value);
                }
            }
        });
        
        // 添加文本区域设置项
        this.settingUtils.addItem({
            key: "InputArea",
            value: "",
            type: "textarea",
            title: "Readonly text",
            description: "Input description",
            // 当失去焦点且内容变化时调用
            action: {
                callback: () => {
                    // 实时读取数据
                    let value = this.settingUtils.take("InputArea");
                    console.log(value);
                }
            }
        });
        
        // 添加复选框设置项
        this.settingUtils.addItem({
            key: "Check",
            value: true,
            type: "checkbox",
            title: "Checkbox text",
            description: "Check description",
            action: {
                callback: () => {
                    // 获取数据并实时保存
                    let value = !this.settingUtils.get("Check");
                    this.settingUtils.set("Check", value);
                    console.log(value);
                }
            }
        });
        
        // 添加下拉选择设置项
        this.settingUtils.addItem({
            key: "Select",
            value: 1,
            type: "select",
            title: "Select",
            description: "Select description",
            options: {
                1: "Option 1",
                2: "Option 2"
            },
            action: {
                callback: () => {
                    // 实时读取数据
                    let value = this.settingUtils.take("Select");
                    console.log(value);
                }
            }
        });
        
        // 添加滑块设置项
        this.settingUtils.addItem({
            key: "Slider",
            value: 50,
            type: "slider",
            title: "Slider text",
            description: "Slider description",
            direction: "column",
            slider: {
                min: 0,
                max: 100,
                step: 1,
            },
            action:{
                callback: () => {
                    // 实时读取数据
                    let value = this.settingUtils.take("Slider");
                    console.log(value);
                }
            }
        });
        
        // 添加按钮设置项
        this.settingUtils.addItem({
            key: "Btn",
            value: "",
            type: "button",
            title: "Button",
            description: "Button description",
            button: {
                label: "Button",
                callback: () => {
                    showMessage("Button clicked");
                }
            }
        });
        
        // 添加自定义元素设置项
        this.settingUtils.addItem({
            key: "Custom Element",
            value: "",
            type: "custom",
            direction: "row",
            title: "Custom Element",
            description: "Custom Element description",
            // 自定义元素必须提供以下方法
            createElement: (currentVal: any) => {
                let div = document.createElement('div');
                div.style.border = "1px solid var(--b3-theme-primary)";
                div.contentEditable = "true";
                div.textContent = currentVal;
                return div;
            },
            getEleVal: (ele: HTMLElement) => {
                return ele.textContent;
            },
            setEleVal: (ele: HTMLElement, val: any) => {
                ele.textContent = val;
            }
        });
        
        // 添加提示信息设置项
        this.settingUtils.addItem({
            key: "Hint",
            value: "",
            type: "hint",
            title: this.i18n.hintTitle,
            description: this.i18n.hintDesc,
        });

        // 尝试加载设置
        try {
            this.settingUtils.load();
        } catch (error) {
            console.error("Error loading settings storage, probably empty config json:", error);
        }

        // 添加编辑器斜杠命令
        this.protyleSlash = [{
            filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("😊");
            }
        }];

        // 添加编辑器工具栏选项
        this.protyleOptions = {
            toolbar: ["block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
                "|",
                {
                    name: "insert-smail-emoji",
                    icon: "iconEmoji",
                    hotkey: "⇧⌘I",
                    tipPosition: "n",
                    tip: this.i18n.insertEmoji,
                    click(protyle: Protyle) {
                        protyle.insert("😊");
                    }
                }],
        };

        console.log(this.i18n.helloPlugin);
    }

    /**
     * 布局准备就绪时执行的方法
     */
    onLayoutReady() {
        // 加载设置数据
        this.settingUtils.load();
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);

        // 示例：读取设置值
        console.log(
            "Official settings value calling example:\n" +
            this.settingUtils.get("InputArea") + "\n" +
            this.settingUtils.get("Slider") + "\n" +
            this.settingUtils.get("Select") + "\n"
        );

        // 创建自定义标签页
        let tabDiv = document.createElement("div");
        new HelloExample({
            target: tabDiv,
            props: {
                app: this.app,
            }
        });
        this.customTab = this.addTab({
            type: TAB_TYPE,
            init() {
                this.element.appendChild(tabDiv);
                console.log(this.element);
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", TAB_TYPE);
            }
        });
    }

    /**
     * 插件卸载时执行的方法
     */
    async onunload() {
        console.log(this.i18n.byePlugin);
        showMessage("Goodbye SiYuan Plugin");
        console.log("onunload");
    }

    /**
     * 插件被删除时执行的方法
     */
    uninstall() {
        console.log("uninstall");
    }

    /**
     * 更新卡片数据
     * @param options 卡片数据选项
     * @returns 排序后的卡片数据
     */
    async updateCards(options: ICardData) {
        // 按blockID排序卡片
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    /**
     * 打开自定义设置面板（使用Svelte实现）
     */
    openDIYSetting(): void {
        let dialog = new Dialog({
            title: "SettingPannel",
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                // 当对话框关闭时销毁组件
                pannel.$destroy();
            }
        });
        let pannel = new SettingExample({
            target: dialog.element.querySelector("#SettingPanel"),
        });
    }

    /**
     * 事件总线粘贴事件处理函数
     * @param event 事件对象
     */
    private eventBusPaste(event: any) {
        // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
        event.preventDefault();
        // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
        });
    }

    /**
     * 事件总线日志事件处理函数
     * @param param0 事件详情
     */
    private eventBusLog({ detail }: any) {
        console.log(detail);
    }

    /**
     * 块图标点击事件处理函数
     * @param param0 事件详情
     */
    private blockIconEvent({ detail }: any) {
        detail.menu.addItem({
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        // 移除文本中的空格
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update"
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            }
        });
    }

    /**
     * 显示对话框
     */
    private showDialog() {
        // 使用Svelte对话框
        svelteDialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            width: this.isMobile ? "92vw" : "720px",
            constructor: (container: HTMLElement) => {
                return new HelloExample({
                    target: container,
                    props: {
                        app: this.app,
                    }
                });
            }
        });
    }

    /**
     * 添加菜单
     * @param rect 矩形区域，用于定位菜单
     */
    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        
        // 添加对话框菜单项
        menu.addItem({
            icon: "iconInfo",
            label: "syak",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.syak.run();
            }
        });
        
        // 非移动端特有菜单项
        if (!this.isMobile) {
            // 添加自定义标签页菜单项
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                text: "This is my custom tab",
                            },
                            id: this.name + TAB_TYPE
                        },
                    });
                    console.log(tab);
                }
            });
            
        } else {
            // 移动端特有菜单项
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc(open help first)",
                click: () => {
                    openMobileFileById(this.app, "20200812220555-lj3enxa");
                }
            });
        }
        
        menu.addSeparator();
        menu.addItem({
            icon: "iconSettings",
            label: "Official Setting Dialog",
            click: () => {
                this.openSetting();
            }
        });
        menu.addItem({
            icon: "iconSettings",
            label: "A custom setting dialog (by svelte)",
            click: () => {
                this.openDIYSetting();
            }
        });
        menu.addItem({
            icon: "iconSparkles",
            label: this.data[STORAGE_NAME].readonlyText || "Readonly",
            type: "readonly",
        });
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }
}
