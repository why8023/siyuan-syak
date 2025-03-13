/**
 * 思源笔记 Anki 同步插件
 * 作用：将思源笔记中的闪卡导出到 Anki
 */
import {
    Plugin,
    showMessage,
    Dialog,
    fetchPost
} from "siyuan";
import "@/index.scss";

// 定义常量
const STORAGE_NAME = "syak-config";
const ANKI_CONNECT_URL = "http://127.0.0.1:8765";

// 定义响应接口
interface IApiResponse {
    code: number;
    data: any;
    msg: string;
}

/**
 * 思源笔记 Anki 同步插件类
 */
export default class SyAnkiPlugin extends Plugin {
    /**
     * 插件初始化
     */
    async onload() {
        // 初始化插件设置
        this.data[STORAGE_NAME] = {
            ankiConnectUrl: ANKI_CONNECT_URL,
            defaultDeck: "Default",
            defaultModel: "Basic",
            frontField: "Front",
            backField: "Back",
            syncMode: "manual", // manual, auto
            autoSyncInterval: 30, // 分钟
            lastSyncTime: 0
        };

        console.log("loading syak-plugin", this.i18n);

        // 添加顶部栏图标
        this.addTopBar({
            icon: "iconFlashcard",
            title: this.i18n.syncToAnki,
            position: "right",
            callback: () => {
                this.openSyncDialog();
            }
        });

        // 设置项
        this.addCommand({
            langKey: "settings",
            hotkey: "",
            callback: () => {
                this.openSettings();
            }
        });

        // 如果设置为自动同步，则启动定时器
        if (this.data[STORAGE_NAME].syncMode === "auto") {
            this.startAutoSync();
        }
    }

    /**
     * 当布局准备就绪时
     */
    onLayoutReady() {
        console.log("syak-plugin layout ready");
    }

    /**
     * 插件卸载时
     */
    async onunload() {
        console.log("unloading syak-plugin");
    }

    /**
     * 打开同步对话框
     */
    openSyncDialog() {
        const dialog = new Dialog({
            title: this.i18n.syncToAnki,
            content: `<div class="b3-dialog__content">
                <div class="fn__flex-column">
                    <div class="fn__flex b3-label">
                        <div class="fn__flex-1">
                            ${this.i18n.syncConfirm}
                        </div>
                    </div>
                </div>
            </div>`,
            width: "420px",
            height: "auto",
        });

        const btnsElement = dialog.element.querySelector(".b3-dialog__action");
        if (btnsElement) {
            btnsElement.innerHTML = `
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                <button class="b3-button b3-button--text">${this.i18n.sync}</button>
            `;

            // 为确认按钮添加点击事件
            const confirmBtn = btnsElement.querySelector(".b3-button--text");
            if (confirmBtn) {
                confirmBtn.addEventListener("click", () => {
                    this.syncFlashcardsToAnki();
                    dialog.destroy();
                });
            }

            // 为取消按钮添加点击事件
            const cancelBtn = btnsElement.querySelector(".b3-button--cancel");
            if (cancelBtn) {
                cancelBtn.addEventListener("click", () => {
                    dialog.destroy();
                });
            }
        }
    }

    /**
     * 打开插件设置对话框
     */
    openSettings() {
        const dialog = new Dialog({
            title: this.i18n.settings,
            content: `<div class="b3-dialog__content">
                <div class="fn__flex-column">
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.ankiConnectUrl}
                                <div class="b3-label__text">${this.i18n.ankiConnectUrlDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="text" id="ankiConnectUrl" value="${this.data[STORAGE_NAME].ankiConnectUrl}">
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.defaultDeck}
                                <div class="b3-label__text">${this.i18n.defaultDeckDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="text" id="defaultDeck" value="${this.data[STORAGE_NAME].defaultDeck}">
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.defaultModel}
                                <div class="b3-label__text">${this.i18n.defaultModelDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="text" id="defaultModel" value="${this.data[STORAGE_NAME].defaultModel}">
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.frontField}
                                <div class="b3-label__text">${this.i18n.frontFieldDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="text" id="frontField" value="${this.data[STORAGE_NAME].frontField}">
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.backField}
                                <div class="b3-label__text">${this.i18n.backFieldDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="text" id="backField" value="${this.data[STORAGE_NAME].backField}">
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.syncMode}
                                <div class="b3-label__text">${this.i18n.syncModeDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <select class="b3-select fn__flex-center fn__size200" id="syncMode">
                                <option value="manual" ${this.data[STORAGE_NAME].syncMode === "manual" ? "selected" : ""}>${this.i18n.manual}</option>
                                <option value="auto" ${this.data[STORAGE_NAME].syncMode === "auto" ? "selected" : ""}>${this.i18n.automatic}</option>
                            </select>
                        </label>
                    </div>
                    <div class="config-item">
                        <label class="fn__flex">
                            <div class="fn__flex-1">
                                ${this.i18n.autoSyncInterval}
                                <div class="b3-label__text">${this.i18n.autoSyncIntervalDesc}</div>
                            </div>
                            <span class="fn__space"></span>
                            <input class="b3-text-field fn__flex-center fn__size200" type="number" id="autoSyncInterval" value="${this.data[STORAGE_NAME].autoSyncInterval}" ${this.data[STORAGE_NAME].syncMode !== "auto" ? "disabled" : ""}>
                        </label>
                    </div>
                    <div class="config-item">
                        <div class="fn__flex">
                            <div class="fn__flex-1"></div>
                            <span class="fn__space"></span>
                            <button class="b3-button b3-button--text fn__flex-center fn__size200" id="saveBtn">${this.i18n.save}</button>
                        </div>
                    </div>
                </div>
            </div>`,
            width: "600px",
            height: "480px",
        });

        // 添加事件监听
        const syncModeSelect = dialog.element.querySelector("#syncMode") as HTMLSelectElement;
        const autoSyncIntervalInput = dialog.element.querySelector("#autoSyncInterval") as HTMLInputElement;

        if (syncModeSelect && autoSyncIntervalInput) {
            syncModeSelect.addEventListener("change", () => {
                autoSyncIntervalInput.disabled = syncModeSelect.value !== "auto";
            });
        }

        // 保存按钮点击事件
        const saveBtn = dialog.element.querySelector("#saveBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                // 获取表单数据
                const ankiConnectUrl = (dialog.element.querySelector("#ankiConnectUrl") as HTMLInputElement).value;
                const defaultDeck = (dialog.element.querySelector("#defaultDeck") as HTMLInputElement).value;
                const defaultModel = (dialog.element.querySelector("#defaultModel") as HTMLInputElement).value;
                const frontField = (dialog.element.querySelector("#frontField") as HTMLInputElement).value;
                const backField = (dialog.element.querySelector("#backField") as HTMLInputElement).value;
                const syncMode = (dialog.element.querySelector("#syncMode") as HTMLSelectElement).value;
                const autoSyncInterval = parseInt((dialog.element.querySelector("#autoSyncInterval") as HTMLInputElement).value);

                // 更新配置
                this.data[STORAGE_NAME] = {
                    ...this.data[STORAGE_NAME],
                    ankiConnectUrl,
                    defaultDeck,
                    defaultModel,
                    frontField,
                    backField,
                    syncMode,
                    autoSyncInterval,
                };

                // 保存配置
                this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);

                // 显示保存成功提示
                showMessage(this.i18n.settingsSaved);

                // 关闭对话框
                dialog.destroy();
            });
        }
    }

    /**
     * 开始自动同步
     */
    startAutoSync() {
        const interval = this.data[STORAGE_NAME].autoSyncInterval * 60 * 1000; // 转换为毫秒
        setInterval(() => {
            this.syncFlashcardsToAnki(true);
        }, interval);
    }

    /**
     * 同步闪卡到Anki
     * @param silent 是否静默同步（不显示提示消息）
     */
    async syncFlashcardsToAnki(silent: boolean = false) {
        try {
            // 检查Anki Connect是否可用
            const version = await this.invokeAnkiConnect("version");
            if (!version) {
                if (!silent) {
                    showMessage(this.i18n.ankiNotRunning);
                }
                return;
            }

            // 获取所有闪卡
            const flashcards = await this.getFlashcards();
            if (!flashcards || flashcards.length === 0) {
                if (!silent) {
                    showMessage(this.i18n.noFlashcards);
                }
                return;
            }

            // 同步闪卡到Anki
            const result = await this.exportFlashcardsToAnki(flashcards);

            // 更新最后同步时间
            this.data[STORAGE_NAME].lastSyncTime = Date.now();
            this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);

            if (!silent) {
                showMessage(this.i18n.syncSuccess.replace("${count}", result.total.toString()));
            }
        } catch (error) {
            console.error("Sync error:", error);
            if (!silent) {
                showMessage(this.i18n.syncError + ": " + error.message);
            }
        }
    }

    /**
     * 调用Anki Connect API
     * @param action API动作
     * @param params API参数
     * @returns API返回结果
     */
    async invokeAnkiConnect(action: string, params: any = {}) {
        const url = this.data[STORAGE_NAME].ankiConnectUrl;
        const version = 6;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action,
                version,
                params
            })
        });

        const responseJson = await response.json();
        if (responseJson.error) {
            throw new Error(responseJson.error);
        }

        return responseJson.result;
    }

    /**
     * 从思源笔记获取所有闪卡
     */
    async getFlashcards(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            fetchPost("/api/riff/getRiffCards", {}, (response: IApiResponse) => {
                if (response.code === 0 && response.data && response.data.cards) {
                    resolve(response.data.cards);
                } else {
                    resolve([]);
                }
            });
        });
    }

    /**
     * 将闪卡导出到Anki
     * @param flashcards 要导出的闪卡列表
     */
    async exportFlashcardsToAnki(flashcards: any[]) {
        const result = {
            total: flashcards.length,
            success: 0,
            failed: 0,
            skipped: 0
        };

        // 检查指定的牌组是否存在，不存在则创建
        const deckName = this.data[STORAGE_NAME].defaultDeck;
        const deckNames = await this.invokeAnkiConnect("deckNames");
        if (!deckNames.includes(deckName)) {
            await this.invokeAnkiConnect("createDeck", { deck: deckName });
        }

        // 检查模型是否存在
        const modelName = this.data[STORAGE_NAME].defaultModel;
        const modelNames = await this.invokeAnkiConnect("modelNames");
        if (!modelNames.includes(modelName)) {
            showMessage(this.i18n.modelNotFound.replace("${modelName}", modelName));
            return result;
        }

        // 获取模型字段
        const modelFieldNames = await this.invokeAnkiConnect("modelFieldNames", { modelName });
        const frontField = this.data[STORAGE_NAME].frontField;
        const backField = this.data[STORAGE_NAME].backField;

        if (!modelFieldNames.includes(frontField) || !modelFieldNames.includes(backField)) {
            showMessage(this.i18n.fieldsNotFound);
            return result;
        }

        // 批量添加笔记
        const notes = [];

        for (const card of flashcards) {
            try {
                // 获取闪卡内容
                const blockId = card.blockID || card.BID; // 兼容不同版本
                const blockData = await this.getBlockInfo(blockId);

                if (!blockData) {
                    result.failed++;
                    continue;
                }

                // 准备笔记数据
                const note = {
                    deckName,
                    modelName,
                    fields: {},
                    options: {
                        allowDuplicate: false,
                        duplicateScope: "deck",
                    },
                    tags: ["siyuan-sync"]
                };

                // 设置前后字段
                note.fields[frontField] = blockData.content;

                // 如果是标题块，使用子块内容作为背面
                if (blockData.type === "h") {
                    const childBlocks = await this.getChildBlocks(blockId);
                    if (childBlocks.length > 0) {
                        let backContent = "";
                        for (const child of childBlocks) {
                            backContent += child.content + "\n";
                        }
                        note.fields[backField] = backContent.trim();
                    } else {
                        note.fields[backField] = ""; // 没有子块时使用空内容
                    }
                } else if (blockData.type === "l") {
                    // 如果是列表项，尝试获取父块和同级块内容
                    const parentBlock = await this.getBlockInfo(blockData.parent_id);
                    if (parentBlock) {
                        note.fields[backField] = parentBlock.content;
                    } else {
                        note.fields[backField] = ""; // 没有父块时使用空内容
                    }
                } else {
                    // 其他类型的块，后面内容为空
                    note.fields[backField] = "";
                }

                notes.push(note);
            } catch (error) {
                console.error("Failed to process flashcard:", error);
                result.failed++;
            }
        }

        // 批量添加笔记到Anki
        if (notes.length > 0) {
            const addResult = await this.invokeAnkiConnect("addNotes", { notes });
            result.success = addResult.filter(id => id !== null).length;
            result.failed = result.total - result.success;
        }

        return result;
    }

    /**
     * 获取块信息
     * @param blockId 块ID
     * @returns 块信息
     */
    private async getBlockInfo(blockId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fetchPost("/api/block/getBlockInfo", { id: blockId }, (response: IApiResponse) => {
                if (response.code === 0 && response.data) {
                    resolve(response.data);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * 获取子块
     * @param blockId 块ID
     * @returns 子块列表
     */
    private async getChildBlocks(blockId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            fetchPost("/api/block/getChildBlocks", { id: blockId }, (response: IApiResponse) => {
                if (response.code === 0 && response.data) {
                    resolve(response.data);
                } else {
                    resolve([]);
                }
            });
        });
    }
}
