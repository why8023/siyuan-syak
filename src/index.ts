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
        this.syak = new SYAK("localhost", 6806, "localhost", 8765, "siyuan", "siyuan");
        // 初始化插件数据
        this.data[STORAGE_NAME] = { readonlyText: "syak" };
        console.log("loading plugin-sample", this.i18n);

        // 检测当前前端环境
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        // 添加自定义图标，SVG格式
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path></symbol>`);
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
        // 添加命令 - 获取打开的标签页
        this.addCommand({
            langKey: "getTab",
            hotkey: "⇧⌘M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });
        // 添加命令 - 手动触发同步事件
        this.addCommand({
            langKey: "syncCards",
            hotkey: "⇧⌘S",
            globalCallback: async () => {
                console.log("手动触发同步事件");
                (this.eventBus as any).emit("sync");
            },
        });
        // 初始化设置工具
        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
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
        // 尝试加载设置
        try {
            this.settingUtils.load();
        } catch (error) {
            console.error("Error loading settings storage, probably empty config json:", error);
        }
        console.log(this.i18n.helloPlugin);
    }

    /**
     * 布局准备就绪时执行的方法
     */
    onLayoutReady() {
        // 加载设置数据
        this.settingUtils.load();
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
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
        // 监听粘贴事件
        (this.eventBus as any).on("paste", async () => {
            console.log("接收到同步事件，启动 SYAK.run()");
            await this.syak.run();
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
    private async eventBusLog({ detail }: any) {
        // await this.syak.run();
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
        menu.addSeparator();
        menu.addItem({
            icon: "iconSettings",
            label: "Official Setting Dialog",
            click: () => {
                this.openSetting();
            }
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
