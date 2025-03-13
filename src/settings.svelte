<script>
    import { onMount } from "svelte";

    export let config = {};
    export let plugin;

    // 本地配置副本，避免直接修改全局配置
    let localConfig = {
        ankiConnectUrl: config.ankiConnectUrl || "http://127.0.0.1:8765",
        defaultDeck: config.defaultDeck || "Default",
        defaultModel: config.defaultModel || "Basic",
        frontField: config.frontField || "Front",
        backField: config.backField || "Back",
        syncMode: config.syncMode || "manual",
        autoSyncInterval: config.autoSyncInterval || 30,
        lastSyncTime: config.lastSyncTime || 0,
    };

    // 模型列表
    let models = [];
    // 牌组列表
    let decks = [];
    // 字段列表
    let fields = [];
    // 连接状态
    let connectionStatus = "unknown"; // unknown, success, error

    onMount(async () => {
        // 测试连接
        await testConnection();

        // 如果连接成功，获取模型和牌组列表
        if (connectionStatus === "success") {
            await loadAnkiData();
        }
    });

    // 测试Anki Connect连接
    async function testConnection() {
        try {
            const version = await invokeAnkiConnect("version");
            connectionStatus = "success";
            return true;
        } catch (error) {
            console.error("Failed to connect to Anki:", error);
            connectionStatus = "error";
            return false;
        }
    }

    // 加载Anki数据
    async function loadAnkiData() {
        try {
            // 获取模型列表
            models = await invokeAnkiConnect("modelNames");

            // 获取牌组列表
            decks = await invokeAnkiConnect("deckNames");

            // 如果已选择了模型，获取字段列表
            if (localConfig.defaultModel) {
                fields = await invokeAnkiConnect("modelFieldNames", {
                    modelName: localConfig.defaultModel,
                });
            }
        } catch (error) {
            console.error("Failed to load Anki data:", error);
        }
    }

    // 当模型改变时更新字段列表
    async function handleModelChange() {
        if (localConfig.defaultModel) {
            try {
                fields = await invokeAnkiConnect("modelFieldNames", {
                    modelName: localConfig.defaultModel,
                });
            } catch (error) {
                console.error("Failed to get model fields:", error);
                fields = [];
            }
        }
    }

    // 调用Anki Connect API
    async function invokeAnkiConnect(action, params = {}) {
        const response = await fetch(localConfig.ankiConnectUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action,
                version: 6,
                params,
            }),
        });

        const responseJson = await response.json();
        if (responseJson.error) {
            throw new Error(responseJson.error);
        }

        return responseJson.result;
    }

    // 保存设置
    function saveSettings() {
        // 更新全局配置
        Object.assign(config, localConfig);

        // 保存到插件数据
        plugin.saveData("syak-config", config);

        // 显示保存成功提示
        plugin.showMessage(plugin.i18n.settingsSaved, "info");
    }

    // 格式化最后同步时间
    function formatLastSyncTime(timestamp) {
        if (!timestamp) return plugin.i18n.never;
        return new Date(timestamp).toLocaleString();
    }
</script>

<div class="config__main fn__flex-column">
    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.ankiConnectUrl}
                <div class="b3-label__text">
                    {plugin.i18n.ankiConnectUrlDesc}
                </div>
            </div>
            <span class="fn__space"></span>
            <input
                class="b3-text-field fn__flex-center fn__size200"
                type="text"
                bind:value={localConfig.ankiConnectUrl}
            />
        </label>
    </div>

    <div class="config-item">
        <div class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.connectionStatus}
            </div>
            <span class="fn__space"></span>
            <button
                class="b3-button b3-button--outline fn__flex-center fn__size200"
                class:b3-button--error={connectionStatus === "error"}
                class:b3-button--success={connectionStatus === "success"}
                on:click={testConnection}
            >
                {#if connectionStatus === "unknown"}
                    {plugin.i18n.testConnection}
                {:else if connectionStatus === "success"}
                    {plugin.i18n.connected}
                {:else}
                    {plugin.i18n.connectionFailed}
                {/if}
            </button>
        </div>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.defaultDeck}
                <div class="b3-label__text">{plugin.i18n.defaultDeckDesc}</div>
            </div>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center fn__size200"
                bind:value={localConfig.defaultDeck}
            >
                {#if decks.length === 0}
                    <option value={localConfig.defaultDeck}
                        >{localConfig.defaultDeck}</option
                    >
                {:else}
                    {#each decks as deck}
                        <option value={deck}>{deck}</option>
                    {/each}
                {/if}
            </select>
        </label>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.defaultModel}
                <div class="b3-label__text">{plugin.i18n.defaultModelDesc}</div>
            </div>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center fn__size200"
                bind:value={localConfig.defaultModel}
                on:change={handleModelChange}
            >
                {#if models.length === 0}
                    <option value={localConfig.defaultModel}
                        >{localConfig.defaultModel}</option
                    >
                {:else}
                    {#each models as model}
                        <option value={model}>{model}</option>
                    {/each}
                {/if}
            </select>
        </label>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.frontField}
                <div class="b3-label__text">{plugin.i18n.frontFieldDesc}</div>
            </div>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center fn__size200"
                bind:value={localConfig.frontField}
            >
                {#if fields.length === 0}
                    <option value={localConfig.frontField}
                        >{localConfig.frontField}</option
                    >
                {:else}
                    {#each fields as field}
                        <option value={field}>{field}</option>
                    {/each}
                {/if}
            </select>
        </label>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.backField}
                <div class="b3-label__text">{plugin.i18n.backFieldDesc}</div>
            </div>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center fn__size200"
                bind:value={localConfig.backField}
            >
                {#if fields.length === 0}
                    <option value={localConfig.backField}
                        >{localConfig.backField}</option
                    >
                {:else}
                    {#each fields as field}
                        <option value={field}>{field}</option>
                    {/each}
                {/if}
            </select>
        </label>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.syncMode}
                <div class="b3-label__text">{plugin.i18n.syncModeDesc}</div>
            </div>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center fn__size200"
                bind:value={localConfig.syncMode}
            >
                <option value="manual">{plugin.i18n.manual}</option>
                <option value="auto">{plugin.i18n.automatic}</option>
            </select>
        </label>
    </div>

    <div class="config-item">
        <label class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.autoSyncInterval}
                <div class="b3-label__text">
                    {plugin.i18n.autoSyncIntervalDesc}
                </div>
            </div>
            <span class="fn__space"></span>
            <input
                class="b3-text-field fn__flex-center fn__size200"
                type="number"
                min="1"
                max="1440"
                bind:value={localConfig.autoSyncInterval}
                disabled={localConfig.syncMode !== "auto"}
            />
        </label>
    </div>

    <div class="config-item">
        <div class="fn__flex">
            <div class="fn__flex-1">
                {plugin.i18n.lastSyncTime}
                <div class="b3-label__text">
                    {formatLastSyncTime(localConfig.lastSyncTime)}
                </div>
            </div>
            <span class="fn__space"></span>
            <button
                class="b3-button b3-button--outline fn__flex-center fn__size200"
                on:click={() => plugin.syncFlashcardsToAnki()}
            >
                {plugin.i18n.syncNow}
            </button>
        </div>
    </div>

    <div class="config-item">
        <div class="fn__flex">
            <div class="fn__flex-1"></div>
            <span class="fn__space"></span>
            <button
                class="b3-button b3-button--text fn__flex-center fn__size200"
                on:click={saveSettings}
            >
                {plugin.i18n.save}
            </button>
        </div>
    </div>
</div>

<style>
    .config__main {
        padding: 16px;
        overflow: auto;
    }

    .config-item {
        margin-bottom: 16px;
        border-bottom: 1px solid var(--b3-border-color);
        padding-bottom: 16px;
    }

    .config-item:last-child {
        border-bottom: none;
    }

    .b3-button--success {
        background-color: var(--b3-theme-success);
        color: var(--b3-theme-on-success);
    }

    .b3-button--error {
        background-color: var(--b3-theme-error);
        color: var(--b3-theme-on-error);
    }
</style>
