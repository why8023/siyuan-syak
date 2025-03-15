import { request, lsNotebooks, sql } from "@/api";
import axios from "axios";

export class SYAK {

    // 思源配置
    siyuanPath: string;
    siyuanPort: number;

    // Anki配置
    ankiPort: number;
    ankiUrl: string;
    ankiModel: string;
    ankiRootDeck: string;


    // 思源模型字段
    modelFields: string[] = [
        "Front",  // 正面
        "Back",   // 背面
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

    // Anki模型配置
    ankiModelConfig: any;

    // 正则表达式
    mediaRegex: RegExp = /(?<=\(assets\/)[\w-]*\d{14}-\S{7}\.[\w]+(?=\))/;

    // 解析器
    lute: any;

    // 存储要执行的 anki action 和 params
    actionsParams: Map<string, any> = new Map();

    // 同步摘要信息
    public summary: string[] = [];

    constructor(siyuanPath: string, siyuanPort: number, ankiPort: number, ankiModel: string, ankiRootDeck: string) {
        this.siyuanPath = siyuanPath;
        this.siyuanPort = siyuanPort;
        this.ankiPort = ankiPort;
        this.ankiModel = ankiModel;
        this.ankiRootDeck = ankiRootDeck;
        // 初始化解析器
        this.lute = window.Lute.New();

        this.ankiUrl = `http://localhost:${this.ankiPort}`;
    }

    // 封装 anki request 请求
    async request_anki(params: any) {
        const resp = await axios.post(this.ankiUrl, params);
        return resp;
    }

    // 检查 anki 模型
    async checkAnkiModel(): Promise<string[]> {
        // card template
        let cardTemplate = {
            "Front": "{{Front}}",  // 正面模板
            "Back": "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",  // 背面模板
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
            cardInfo.set("Front", x.fields.Front);
            cardInfo.set("Back", x.fields.Back);
            cardInfo.set("syak_anki_id", x.NoteId);
            cardInfo.set("syak_id", x.fields.id);
            cardInfo.set("syak_parent_id", x.fields.parent_id);
            cardInfo.set("syak_root_id", x.fields.root_id);
            cardInfo.set("syak_box", x.fields.box);
            cardInfo.set("syak_deck", x.fields.deck);
            cardInfo.set("syak_type", x.fields.type);
            cardInfo.set("syak_subtype", x.fields.subtype);
            cardInfo.set("syak_created", x.fields.created);
            cardInfo.set("syak_updated", x.fields.updated);
            ankiCardsInfo.set(cardInfo.get("syak_id"), cardInfo);
        });
        return ankiCardsInfo;
    }

    /*
    create anki deck
    */
    async createAnkiDeck(deck: string[]): Promise<void> {
        // 为每个牌组创建请求
        // 使用 deck 进行 map 操作, 返回结果
        let createDeckParams = deck.map(x => {
            return {
                "action": "createDeck",
                "version": 6,
                "params": { "deck": x },
            };
        });
        // 使用 multi 操作批量执行
        this.actionsParams.set("createDeck", { "action": "multi", "version": 6, "params": { "actions": createDeckParams } });
        console.log(this.actionsParams);
    }

    /*
    get anki deck info
    */
    async getAnkiDeckInfo(deck: string[], preserve_deck: string[] = ["default"]): Promise<string[]> {
        // 为每个牌组创建请求
        let findCardsParams = deck.map(x => {
            return {
                "action": "findCards",
                "version": 6,
                "params": { "query": `"deck:${x}"` },
            };
        });
        // 获取牌组信息
        let cardsInfoResp = await this.request_anki({ "action": "multi", "version": 6, "params": { "actions": findCardsParams } });
        let cardsInfo = cardsInfoResp.data.result;
        // 提取牌组信息到列表
        let deckInfo = cardsInfo.map(x => {
            return {
                "deck": x.deck,
                "count": x.result.length,
            };
        });

        // 找出空牌组且不匹配保留模式的牌组
        let delDeck = deckInfo.filter(x => x.count == 0 && !preserve_deck.includes(x.deck));
        console.log(delDeck);

        return delDeck;
    }

    /*  
    delete anki deck
    */
    async deleteAnkiDeck(deck: string[]): Promise<void> {
        // 为每个牌组创建请求
        let deleteDeckParams = deck.map(x => {
            return {
                "action": "deleteDeck",
                "version": 6,
                "params": {
                    "decks": x,
                    "cardsToo": true // 同时删除牌组中的卡片
                },
            };
        });
        // 使用 multi 操作批量执行
        this.actionsParams.set("deleteDeck", { "action": "multi", "version": 6, "params": { "actions": deleteDeckParams } });
        console.log(this.actionsParams);
    }

    /*
    media from blocks
    */
    async mediaFromBlocks(blocks: any[]): Promise<void> {
        // 提取媒体文件
        let mediaRegex = /(?<=\(assets\/)[\w-]*\d{14}-\S{7}\.[\w]+(?=\))/;
        let currentMedia = blocks.map(x => x.markdown).join("\n");
        let currentMediaList = currentMedia.match(mediaRegex);
        console.log(currentMediaList);

        let parentMedia = blocks.map(x => x.parent_markdown).join("\n");
        let parentMediaList = parentMedia.match(mediaRegex);
        console.log(parentMediaList);

        // 合并媒体文件
        let mediaList = [...currentMediaList, ...parentMediaList];
        console.log(mediaList);

        // 创建 media 请求
        let mediaParams = mediaList.map(x => {
            return {
                "action": "storeMediaFile",
                "version": 6,
                "params": { "filename": x, "path": `${this.siyuanPath}/data/assets/${x}` },
            };
        });
        // 使用 multi 操作批量执行
        this.actionsParams.set("storeMediaFile", { "action": "multi", "version": 6, "params": { "actions": mediaParams } });
        console.log(this.actionsParams);
    }

    /*
    merge parent blocks
    */
    async mergeParentBlocks(blocks: any[]): Promise<any[]> {
        // 获取所有父块ID
        let parentIds = blocks.map(x => x.parent_id);

        // 查询父块信息
        let sqlQuery = `SELECT * FROM blocks WHERE id IN (${parentIds.map(id => `'${id}'`).join(',')}) AND type IN ('l', 'i', 'b', 's')`;
        let parentBlocks = await sql(sqlQuery);

        // 创建父块映射，用于快速查找
        let parentMap = new Map();
        parentBlocks.forEach(parent => {
            parentMap.set(parent.id, {
                parent_id: parent.id,
                parent_markdown: parent.markdown,
                parent_updated: parent.updated,
                parent_hash: parent.hash
            });
        });

        // 合并父块信息到子块
        let mergedBlocks = blocks.map(block => {
            let parent = parentMap.get(block.parent_id);
            if (parent) {
                // 父块存在，合并信息
                return {
                    ...block,
                    parent_markdown: parent.parent_markdown,
                    parent_updated: parent.parent_updated,
                    parent_hash: parent.parent_hash,
                    URL_id: block.parent_id
                };
            } else {
                // 父块不存在，使用默认值
                return {
                    ...block,
                    parent_markdown: "",
                    parent_updated: "",
                    parent_hash: "",
                    URL_id: block.id
                };
            }
        });

        return mergedBlocks;
    }



    /*
    update anki deck
    */
    async updateAnkiDeck(deck: Map<string, string>[]): Promise<void> {
        // 按牌组分组
        let deckGroups = new Map<string, string[]>();

        // 遍历每个卡片，按牌组分组
        deck.forEach(item => {
            const deckName = item.get("deck");
            const cardId = item.get("cards");

            if (!deckGroups.has(deckName)) {
                deckGroups.set(deckName, []);
            }

            deckGroups.get(deckName).push(cardId);
        });

        // 为每个牌组创建更改请求
        let changeDeckParams = Array.from(deckGroups.entries()).map(([deckName, cards]) => {
            return {
                "action": "changeDeck",
                "version": 6,
                "params": {
                    "cards": cards,
                    "deck": deckName,
                }
            };
        });

        // 使用multi操作批量执行
        this.actionsParams.set("changeDeck", {
            "action": "multi",
            "version": 6,
            "params": { "actions": changeDeckParams }
        });

        console.log(this.actionsParams);
    }

    /*
    删除Anki笔记
    */
    async deleteAnkiNotes(noteIds: string[]): Promise<void> {
        // 创建删除笔记的请求
        const deleteNotesJson = {
            "action": "deleteNotes",
            "version": 6,
            "params": { "notes": noteIds },
        };

        // 保存到actions参数中
        this.actionsParams.set("deleteNotes", deleteNotesJson);

        console.log(this.actionsParams);
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
            cardInfo.set("Front", card.fcontent ? card.fcontent : card.markdown);
            cardInfo.set("Back", card.bcontent ? card.bcontent : card.markdown);
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
    对比 ankiCardsInfo 和 siyuanCardsInfo
    找出需要创建、更新和删除的卡片
    */
    async compareAnkiCardsInfo(ankiCardsInfo: Map<string, Map<string, string>>, siyuanCardsInfo: Map<string, Map<string, string>>): Promise<any> {
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

        return cmpResult;
    }

    /*
    create anki cards
    */
    async createAnkiCards(createCards: Map<string, string>[]): Promise<void> {
        // markdown 转换为 html
        createCards.forEach(item => {
            item["Front"] = this.lute.Md2HTML(item.get("Front"));
            item["Back"] = this.lute.Md2HTML(item.get("Back"));
        });
        // 为每个笔记创建请求
        let createNoteParams = createCards.map(x => {
            return {
                "deckName": x.get("syak_deck"),
                "modelName": this.ankiModel,
                "fields": x,
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
        // 为每个笔记添加front字段，存储转换为HTML的内容
        updateCards.forEach(item => {
            item["Front"] = this.lute.Md2HTML(item.get("Front"));
            item["Back"] = this.lute.Md2HTML(item.get("Back"));
        });
        // 为每个笔记创建请求
        let syakAnkiIds = [];
        updateCards.forEach(x => {
            syakAnkiIds.push(x.get("syak_anki_id"));
            x.delete("syak_anki_id");
        });
        let updateNoteParams = updateCards.map(x => {
            return {
                "action": "updateNoteFields",
                "version": 6,
                "params": {
                    "note": {
                        "id": syakAnkiIds.shift(),
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
    统计需要新增\删除的deck
    */
    async getDecksInfo(ankiDecks: string[], needCreate: Map<string, string>[], needUpdate: Map<string, string>[]): Promise<any> {
        let deckResult = {
            "create": [],
            "delete": [],
        };
        let usedDecks = new Set<string>();
        needCreate.forEach(x => {
            usedDecks.add(x.get("syak_deck"));
        });
        needUpdate.forEach(x => {
            usedDecks.add(x.get("syak_deck"));
        });
        ankiDecks.forEach(x => {
            if (!usedDecks.has(x)) {
                deckResult.delete.push(x);
            }
        });
        usedDecks.forEach(x => {
            if (!ankiDecks.includes(x)) {
                deckResult.create.push(x);
            }
        });

        // 创建deck
        this.actionsParams.set("createDecks", { "action": "multi", "version": 6, "params": { "actions": deckResult.create.map(x => ({ "action": "createDeck", "version": 6, "params": { "deck": x } })) } });

        // 更新deck
        this.actionsParams.set("changeDecks", { "action": "multi", "version": 6, "params": { "actions": needUpdate.map(x => ({ "action": "changeDeck", "version": 6, "params": { "cards": [x.get("syak_anki_id")], "deck": x.get("syak_deck") } })) } });

        // 删除deck
        this.actionsParams.set("deleteDecks", { "action": "deleteDecks", "version": 6, "params": { "decks": deckResult.delete } });

        return deckResult;
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
        const cmpResult = await this.compareAnkiCardsInfo(ankiCardsInfo, siyuanCardsInfo);
        this.createAnkiCards(cmpResult.create);
        this.updateAnkiCards(cmpResult.update);
        this.deleteAnkiCards(cmpResult.delete);
        // 统计需要新增\删除的deck
        const deckNamesResp = await this.request_anki({
            "action": "deckNames",
            "version": 6,
        });
        const ankiDecks = deckNamesResp.data.result;
        const decksInfo = await this.getDecksInfo(ankiDecks, cmpResult.create, cmpResult.update);
        // todo: 处理媒体文件

        // 按顺序执行请求
        // 创建deck
        let createDeckResp = await this.request_anki(this.actionsParams.get("createDecks"));
        if (createDeckResp.status != 200) {
            console.error("createDeckResp: ", createDeckResp.data);
            return;
        }
        // 创建卡片
        let addNotesResp = await this.request_anki(this.actionsParams.get("addNotes"));
        if (addNotesResp.status != 200) {
            console.error("addNotesResp: ", addNotesResp.data);
            return;
        }
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
        let deleteDecksResp = await this.request_anki(this.actionsParams.get("deleteDecks"));
        if (deleteDecksResp.status != 200) {
            console.error("deleteDecksResp: ", deleteDecksResp.data);
            return;
        }
        // 删除未使用的牌组
        // TODO: 实现删除未使用牌组的逻辑

        // 发送完成通知
        await this.sendFinishNotification(this.summary.join("\n"));
    }
}
