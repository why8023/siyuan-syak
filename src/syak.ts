import { request, lsNotebooks, sql } from "@/api";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import markedKatex from "marked-katex-extension";
import axios from "axios";
import MarkdownIt from 'markdown-it';

export class SYAK {
    // 思源配置
    siyuanHost: string;
    siyuanPort: number;
    siyuanApiUrl: string;
    // anki配置
    ankiHost: string;
    ankiPort: number;
    ankiApiUrl: string;
    ankiModel: string;
    ankiRootDeck: string;
    // 思源模型字段
    modelFields: string[] = [
        "syak_front",  // 正面
        "syak_back",   // 背面
        "syak_id",  // 卡片ID
        "syak_parent_id",  // 父块ID
        "syak_root_id",  // 根块ID
        "syak_box",  // 盒子ID
        "syak_deck",  // 集合名
        "syak_type",     // 类型
        "syak_subtype",  // 子类型
        "syak_created",  // 创建时间
        "syak_updated",  // 更新时间
    ]
    // 解析器
    lute: any;
    marked: any;
    markdownit: any;
    // 存储要执行的 anki action 和 params
    actionsParams: Map<string, any> = new Map();
    // 同步摘要信息
    public summary: string[] = [];

    constructor(siyuanHost: string = "localhost", siyuanPort: number = 6806, ankiHost: string = "localhost", ankiPort: number = 8765, ankiModel: string = "siyuan", ankiRootDeck: string = "siyuan") {
        // 思源配置
        this.siyuanHost = siyuanHost;
        this.siyuanPort = siyuanPort;
        this.siyuanApiUrl = `http://${this.siyuanHost}:${this.siyuanPort}`;
        // anki配置
        this.ankiHost = ankiHost;
        this.ankiPort = ankiPort;
        this.ankiApiUrl = `http://${this.ankiHost}:${this.ankiPort}`;
        this.ankiModel = ankiModel;
        this.ankiRootDeck = ankiRootDeck;
        // 初始化解析器
        this.lute = window.Lute.New();
        // marked
        this.marked = new Marked();
        this.marked.use(markedHighlight({
            emptyLangClass: 'hljs',
            langPrefix: 'hljs language-',
            highlight(code, lang, info) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        }))
        const markedKatexOptions = {
            nonStandard: true
        };
        this.marked.use(markedKatex(markedKatexOptions));
        // markdown-it
        this.markdownit = new MarkdownIt();
    }

    // 封装 anki request 请求
    async request_anki(params: any) {
        const resp = await axios.post(this.ankiApiUrl, params);
        return resp;
    }

    // 检查 anki 模型
    async checkAnkiModel(): Promise<string[]> {
        // card template
        let cardTemplate = {
            "Front": "{{syak_front}}",  // 正面模板
            "Back": "{{FrontSide}}\n\n<hr id=answer>\n\n{{syak_back}}",  // 背面模板
        }
        // 获取 Anki 现有模型
        let resp = await this.request_anki({
            "action": "modelNames",
            "version": 6,
        });
        let existModels = resp.data.result;
        console.log(resp.data.result);
        console.log(this.ankiModel);
        // 如果模型不存在，创建新模型
        if (!existModels.includes(this.ankiModel)) {
            resp = await this.request_anki({
                "action": "createModel",
                "version": 6,
                "params": {
                    "modelName": this.ankiModel,
                    "inOrderFields": this.modelFields,
                    "cardTemplates": [cardTemplate],
                },
            });
            // 如果创建成功，打印成功信息，否则打印失败信息并退出程序
            if (resp.status === 200) {
                console.log("Anki model created.");
            } else {
                console.error("Anki model created failed.");
                process.exit(1);
            }
        }
        return existModels;
    }

    /*
    get anki cards info
    */
    async getAnkiCardsInfo(): Promise<Map<string, Map<string, string>>> {
        let ankiCardsInfo = new Map<string, Map<string, string>>();
        let findCardsResp = await this.request_anki({
            "action": "findCards",
            "version": 6,
            "params": {
                "query": `"note:${this.ankiModel}"`,
            },
        });
        if (findCardsResp.status != 200) {
            return ankiCardsInfo;
        }
        let ankiCardsIds = findCardsResp.data.result;

        // 获取笔记详细信息
        let cardsInfoResp = await this.request_anki({
            "action": "cardsInfo",
            "version": 6,
            "params": {
                "cards": ankiCardsIds,
            },
        });
        if (cardsInfoResp.status != 200) {
            return ankiCardsInfo;
        }
        let ankiCards = cardsInfoResp.data.result;

        // 提取笔记信息到列表
        ankiCards.forEach(x => {
            let cardInfo = new Map<string, string>();
            cardInfo.set("syak_front", x.fields.syak_front.value);
            cardInfo.set("syak_back", x.fields.syak_back.value);
            cardInfo.set("syak_anki_id", x.note);
            cardInfo.set("syak_id", x.fields.syak_id.value);
            cardInfo.set("syak_parent_id", x.fields.syak_parent_id.value);
            cardInfo.set("syak_root_id", x.fields.syak_root_id.value);
            cardInfo.set("syak_box", x.fields.syak_box.value);
            cardInfo.set("syak_deck", x.fields.syak_deck.value);
            cardInfo.set("syak_type", x.fields.syak_type.value);
            cardInfo.set("syak_subtype", x.fields.syak_subtype.value);
            cardInfo.set("syak_created", x.fields.syak_created.value);
            cardInfo.set("syak_updated", x.fields.syak_updated.value);
            ankiCardsInfo.set(cardInfo.get("syak_id"), cardInfo);
        });
        return ankiCardsInfo;
    }

    /*
    向思源发送同步完成通知
    */
    async sendFinishNotification(msg: string = ""): Promise<void> {
        try {
            // 发送通知请求
            const response = await request("pushMsg", {
                "msg": `Anki sync finished\n${msg}`,
                "timeout": 5000
            });
            if (response.status != 200) {
                console.error("发送通知失败:", response.statusText);
            }
        } catch (error) {
            console.error("发送通知出错:", error);
        }
    }

    /*
    获取思源中的卡片
    */
    async getSiyuanCards(): Promise<any[]> {
        const cardQuery = "SELECT * FROM blocks WHERE id in (SELECT block_id FROM attributes WHERE name = 'custom-riff-decks')";
        const siyuanCards = await sql(cardQuery);
        if (!siyuanCards || siyuanCards.length === 0) {
            console.warn("getSiyuanCards: siyuan cards not found.");
            return [];
        }
        return siyuanCards;
    }

    /*
    提取思源中的卡片信息
    */
    async getSiyuanCardsInfo(siyuanCards: any[], siyuanNBIdNameMap: Map<string, string>): Promise<Map<string, Map<string, string>>> {
        let siyuanCardsInfo = new Map<string, Map<string, string>>();
        siyuanCards.forEach(card => {
            let cardInfo = new Map<string, string>();
            cardInfo.set("syak_front", card.fcontent ? card.fcontent : card.markdown);
            cardInfo.set("syak_back", card.bcontent ? card.bcontent : card.markdown);
            cardInfo.set("syak_id", card.id);
            cardInfo.set("syak_parent_id", card.parent_id);
            cardInfo.set("syak_root_id", card.root_id);
            cardInfo.set("syak_box", card.box);
            cardInfo.set("syak_deck", (this.ankiRootDeck + "/" + siyuanNBIdNameMap.get(card.box) + card.hpath).replace(/\//g, "::"));
            cardInfo.set("syak_type", card.type);
            cardInfo.set("syak_subtype", card.subtype);
            cardInfo.set("syak_created", card.created);
            cardInfo.set("syak_updated", card.updated);
            siyuanCardsInfo.set(cardInfo.get("syak_id"), cardInfo);
        });
        return siyuanCardsInfo;
    }
    /*
    处理front和back的markdown转换为HTML
    */
    handleSiyuanMarkdown(md: string): string {
        // 处理资源文件
        // 例如: 
        // 如果内容是: 包含图片的段落卡![image](assets/image-20250315125431-bs9xpl6.png)
        // 需要转换为: 包含图片的段落卡![image](https://127.0.0.1:6806/assets/image-20250315125431-bs9xpl6.png) 
        // 不仅仅局限于图片, 还包括视频, 音频, 等资源文件
        // 处理资源文件路径
        // 匹配所有的资源文件链接，包括图片、视频、音频等
        const assetRegex = /\((assets\/[\w-]*\d{14}-\S{7}\.[\w]+)\)/g;

        // 替换所有匹配到的资源文件链接
        let tunedMd = md.replace(assetRegex, (match, assetPath) => {
            // 将相对路径转换为完整的思源API URL
            return match.replace(assetPath, this.siyuanApiUrl + "/" + assetPath);
        });

        // 处理siyuan link
        // 例如: "* 无序列表卡\n\n  * 无序列表背面\n  * ((20240316170331-169pbdl 'data'))"
        // 需要转换为: "* 无序列表卡\n\n  * 无序列表背面\n  * [data](siyuan://blocks/20240316170331-169pbdl?focus=1)"
        const siyuanLinkRegex = /(\(\((\d{14}-\S{7})\s['"](\w+)['"]\)\))/g;
        tunedMd = tunedMd.replace(siyuanLinkRegex, (match, link, url, title) => {
            return match.replace(link, `[${title}](siyuan://blocks/${url}?focus=1)`);
        });
        return this.marked.parse(tunedMd);
    }

    /*
    对比 ankiCardsInfo 和 siyuanCardsInfo
    找出需要创建、更新和删除的卡片
    */
    async compareCardsInfo(ankiCardsInfo: Map<string, Map<string, string>>, siyuanCardsInfo: Map<string, Map<string, string>>): Promise<any> {
        let cmpResult = {
            "create": [],
            "update": [],
            "delete": [],
        };
        // to create
        siyuanCardsInfo.forEach((siyuanCard, key) => {
            if (!ankiCardsInfo.has(key)) {
                cmpResult.create.push(siyuanCard);
            }
        });
        // to update
        siyuanCardsInfo.forEach((siyuanCard, key) => {
            if (ankiCardsInfo.has(key)) {
                let ankiCard = ankiCardsInfo.get(key);
                siyuanCard.set("syak_anki_id", ankiCard.get("syak_anki_id"));
                if (
                    siyuanCard.get("syak_updated") > ankiCard.get("syak_updated") // 更新时间
                    || siyuanCard.get("syak_deck") != ankiCard.get("syak_deck") // 集合名
                    || siyuanCard.get("syak_hash") != ankiCard.get("syak_hash") // 哈希值
                ) {
                    cmpResult.update.push(siyuanCard);
                }
            }
        });
        // to delete
        ankiCardsInfo.forEach((ankiCard, key) => {
            if (!siyuanCardsInfo.has(key)) {
                cmpResult.delete.push(ankiCard);
            }
        });
        // 更新create和update的字段
        for (let card of [...cmpResult.create, ...cmpResult.update]) {
            this.modelFields.forEach(field => {
                if (field === "syak_front") {
                    card[field] = this.handleSiyuanMarkdown(card.get(field));
                } else if (field === "syak_back") {
                    card[field] = this.handleSiyuanMarkdown(card.get(field));
                } else {
                    card[field] = card.get(field);
                }
            });
        }

        return cmpResult;
    }

    /*
    create anki cards
    */
    async createAnkiCards(createCards: Map<string, string>[]): Promise<void> {
        // 为每个笔记创建请求
        let createNoteParams = createCards.map(x => {
            return {
                "deckName": x.get("syak_deck"),
                "modelName": this.ankiModel,
                "fields": x,
                "options": {
                    "allowDuplicate": false,
                    "duplicateScope": "deck",
                    "duplicateScopeOptions": {
                        "deckName": "Default",
                        "checkChildren": false,
                        "checkAllModels": false
                    }
                },
            };
        });
        // 创建请求
        this.actionsParams.set("addNotes", { "action": "addNotes", "version": 6, "params": { "notes": createNoteParams } });
        console.log(this.actionsParams);
    }

    /*
    update anki cards
    */
    async updateAnkiCards(updateCards: Map<string, string>[]): Promise<void> {
        // 为每个笔记创建请求
        let updateNoteParams = updateCards.map(x => {
            return {
                "action": "updateNoteFields",
                "version": 6,
                "params": {
                    "note": {
                        "id": x.get("syak_anki_id"),
                        "fields": x,
                    }
                },
            };
        });
        // 创建请求
        this.actionsParams.set("updateNoteFields", { "action": "multi", "version": 6, "params": { "actions": updateNoteParams } });
        console.log(this.actionsParams);
    }

    /*
    delete anki cards
    */
    async deleteAnkiCards(deleteCards: Map<string, string>[]): Promise<void> {
        // 创建请求
        this.actionsParams.set("deleteNotes", { "action": "deleteNotes", "version": 6, "params": { "notes": deleteCards.map(x => x.get("syak_anki_id")) } });
        console.log(this.actionsParams);
    }

    /*
    统计需要新增\更新的deck
    */
    async getDecksInfo(ankiDecks: string[], needCreate: Map<string, string>[], needUpdate: Map<string, string>[]): Promise<any> {
        let createDecks = [];
        let siyuanDecks = new Set<string>();
        needCreate.forEach(x => {
            siyuanDecks.add(x.get("syak_deck"));
        });
        needUpdate.forEach(x => {
            siyuanDecks.add(x.get("syak_deck"));
        });
        // 统计需要新增的deck
        siyuanDecks.forEach(x => {
            if (!ankiDecks.includes(x)) {
                createDecks.push(x);
            }
        });
        // 创建deck
        this.actionsParams.set("createDecks", { "action": "multi", "version": 6, "params": { "actions": createDecks.map(x => ({ "action": "createDeck", "version": 6, "params": { "deck": x } })) } });
        // 更新deck
        this.actionsParams.set("changeDecks", { "action": "multi", "version": 6, "params": { "actions": needUpdate.map(x => ({ "action": "changeDeck", "version": 6, "params": { "cards": [x.get("syak_anki_id")], "deck": x.get("syak_deck") } })) } });
        return createDecks;
    }

    /*
    查找无效的deck
    */
    async findInvalidDecks(): Promise<void> {
        // 获取anki deck 列表
        let deckNamesResp = await this.request_anki({
            "action": "deckNames",
            "version": 6,
        });
        let ankiDecks = deckNamesResp.data.result;
        // 获取需要删除deck的cards计数
        let getDeckStatsResp = await this.request_anki({
            "action": "getDeckStats",
            "version": 6,
            "params": { "decks": ankiDecks },
        });
        if (getDeckStatsResp.status != 200) {
            console.error("getDeckStatsResp: ", getDeckStatsResp.data);
            return;
        }
        // 获取需要删除deck的cards计数
        let deckStats = getDeckStatsResp.data.result;
        let deleteDeckCardsCount = new Map<string, number>();
        Object.entries(deckStats).forEach(([key, value]) => {
            const typedValue = value as { name: string, total_in_deck: number };
            deleteDeckCardsCount.set(typedValue.name, typedValue.total_in_deck);
        });
        // 计数大于0的deck
        let validDecks = ankiDecks.filter(x => {
            const parts = x.split("::");
            return deleteDeckCardsCount.get(parts[parts.length - 1]) > 0;
        });
        // 计数等于0的deck
        let invalidDecks = ankiDecks.filter(x => {
            return !validDecks.includes(x);
        });
        // 统计需要删除的deck, 检查 invalidDecks 不是 validDecks 的前缀
        let deleteDecks = invalidDecks.filter(x => {
            return !validDecks.some(deck => deck.startsWith(x));
        });
        // 删除无效的deck
        this.actionsParams.set("deleteDecks", { "action": "deleteDecks", "version": 6, "params": { "decks": deleteDecks, "cardsToo": true } });
        console.log(this.actionsParams);
    }

    async run(): Promise<void> {
        // 检查 Anki 模型
        await this.checkAnkiModel();
        // 获取思源笔记本
        const notebooksResp = await lsNotebooks();
        const siyuanNotebooks = notebooksResp.notebooks;
        if (!siyuanNotebooks || siyuanNotebooks.length === 0) {
            console.warn("run: siyuan notebooks not found.");
            return;
        }
        let siyuanNBIdNameMap = new Map<string, string>();
        siyuanNotebooks.forEach(x => {
            siyuanNBIdNameMap.set(x.id, x.name);
        });
        // 获取anki卡片信息
        const ankiCardsInfo = await this.getAnkiCardsInfo();
        // 获取思源卡片信息
        const siyuanCards = await this.getSiyuanCards();
        if (!siyuanCards || siyuanCards.length === 0) {
            return;
        }
        // 提取卡片信息
        const siyuanCardsInfo = await this.getSiyuanCardsInfo(siyuanCards, siyuanNBIdNameMap);
        // 对比 ankiCardsInfo 和 siyuanCardsInfo
        // 找出需要创建、更新和删除的卡片
        const cmpResult = await this.compareCardsInfo(ankiCardsInfo, siyuanCardsInfo);
        this.createAnkiCards(cmpResult.create);
        this.updateAnkiCards(cmpResult.update);
        this.deleteAnkiCards(cmpResult.delete);
        // 统计需要新增\更新的deck
        const deckNamesResp = await this.request_anki({
            "action": "deckNames",
            "version": 6,
        });
        const ankiDecks = deckNamesResp.data.result;
        const createDecks = await this.getDecksInfo(ankiDecks, cmpResult.create, cmpResult.update);

        // 按顺序执行请求
        // 创建deck
        let createDeckResp = await this.request_anki(this.actionsParams.get("createDecks"));
        if (createDeckResp.status != 200) {
            console.error("createDeckResp: ", createDeckResp.data);
            return;
        }
        // // test create card
        // let testCreateCardResp = await this.request_anki({
        //     "action": "addNotes",
        //     "version": 6,
        //     "params": {
        //         "notes": [this.actionsParams.get("addNotes").params.notes[0]]
        //     }
        // });
        // if (testCreateCardResp.status != 200) {
        //     console.error("testCreateCardResp: ", testCreateCardResp.data);
        //     return;
        // }
        // 创建卡片
        let addNotesResp = await this.request_anki(this.actionsParams.get("addNotes"));
        if (addNotesResp.status != 200) {
            console.error("addNotesResp: ", addNotesResp.data);
            return;
        }
        let addNoteResult = addNotesResp.data.result;
        cmpResult.create.forEach(x => {
            x.set("syak_anki_id", addNoteResult.shift());
        });
        // 更新卡片
        let updateNoteFieldsResp = await this.request_anki(this.actionsParams.get("updateNoteFields"));
        if (updateNoteFieldsResp.status != 200) {
            console.error("updateNoteFieldsResp: ", updateNoteFieldsResp.data);
            return;
        }
        // 更新deck
        let changeDecksResp = await this.request_anki(this.actionsParams.get("changeDecks"));
        if (changeDecksResp.status != 200) {
            console.error("changeDecksResp: ", changeDecksResp.data);
            return;
        }
        // 删除卡片
        let deleteNotesResp = await this.request_anki(this.actionsParams.get("deleteNotes"))
        if (deleteNotesResp.status != 200) {
            console.error("deleteNotesResp: ", deleteNotesResp.data);
            return;
        }
        // 删除deck
        // 查找无效的deck
        await this.findInvalidDecks();
        let deleteDecksResp = await this.request_anki(this.actionsParams.get("deleteDecks"));
        if (deleteDecksResp.status != 200) {
            console.error("deleteDecksResp: ", deleteDecksResp.data);
            return;
        }
        // 发送完成通知
        // await this.sendFinishNotification(this.summary.join("\n"));
    }
}
