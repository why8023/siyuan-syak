/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 * 
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 文档见 [API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */
// 本文件封装了与后端 API 通信的各种函数，提供了对笔记本、文件、区块、SQL、模板等功能的调用接口。

import { fetchPost, fetchSyncPost, IWebSocketData } from "siyuan"; // 导入请求函数和数据类型

/**
 * 封装 API 请求
 * 使用 fetchSyncPost 发送 POST 请求，并根据返回的 code 判断是否成功。
 * @param url 请求的接口地址
 * @param data 请求时需要发送的数据，可以是对象或 FormData 等
 * @returns 如果响应中的 code 为 0，则返回 response.data，否则返回 null
 */
export async function request(url: string, data: any) {
    let response: IWebSocketData = await fetchSyncPost(url, data); // 发送同步 POST 请求
    let res = response.code === 0 ? response.data : null; // 根据响应状态码判断请求是否成功
    return res;
}


// **************************************** Noteboook ****************************************

/**
 * 获取所有笔记本的列表
 * @returns 返回一个 Promise，resolve 后结果为笔记本列表数据（类型 IReslsNotebooks）
 */
export async function lsNotebooks(): Promise<IReslsNotebooks> {
    let url = '/api/notebook/lsNotebooks'; // 定义接口地址
    return request(url, ''); // 无需传递数据，传空字符串即可
}

/**
 * 打开指定的笔记本
 * @param notebook 笔记本的 ID
 * @returns 返回打开笔记本的操作结果
 */
export async function openNotebook(notebook: NotebookId) {
    let url = '/api/notebook/openNotebook';
    return request(url, { notebook: notebook }); // 传递笔记本 ID
}

/**
 * 关闭指定的笔记本
 * @param notebook 笔记本的 ID
 * @returns 返回关闭笔记本的操作结果
 */
export async function closeNotebook(notebook: NotebookId) {
    let url = '/api/notebook/closeNotebook';
    return request(url, { notebook: notebook });
}

/**
 * 重命名笔记本
 * @param notebook 笔记本的 ID
 * @param name 新的笔记本名称
 * @returns 返回重命名后笔记本的相关数据
 */
export async function renameNotebook(notebook: NotebookId, name: string) {
    let url = '/api/notebook/renameNotebook';
    return request(url, { notebook: notebook, name: name });
}

/**
 * 创建一个新的笔记本
 * @param name 新笔记本的名称
 * @returns 返回一个 Promise，resolve 后为创建的笔记本对象（类型 Notebook）
 */
export async function createNotebook(name: string): Promise<Notebook> {
    let url = '/api/notebook/createNotebook';
    return request(url, { name: name });
}

/**
 * 删除指定的笔记本
 * @param notebook 笔记本的 ID
 * @returns 返回删除操作的结果
 */
export async function removeNotebook(notebook: NotebookId) {
    let url = '/api/notebook/removeNotebook';
    return request(url, { notebook: notebook });
}

/**
 * 获取指定笔记本的配置信息
 * @param notebook 笔记本的 ID
 * @returns 返回一个 Promise，resolve 后为笔记本配置数据（类型 IResGetNotebookConf）
 */
export async function getNotebookConf(notebook: NotebookId): Promise<IResGetNotebookConf> {
    let data = { notebook: notebook };
    let url = '/api/notebook/getNotebookConf';
    return request(url, data);
}

/**
 * 设置指定笔记本的配置信息
 * @param notebook 笔记本的 ID
 * @param conf 配置对象（类型 NotebookConf）
 * @returns 返回一个 Promise，resolve 后为更新后的配置数据
 */
export async function setNotebookConf(notebook: NotebookId, conf: NotebookConf): Promise<NotebookConf> {
    let data = { notebook: notebook, conf: conf };
    let url = '/api/notebook/setNotebookConf';
    return request(url, data);
}


// **************************************** File Tree ****************************************

/**
 * 使用 Markdown 内容创建文档
 * @param notebook 笔记本的 ID
 * @param path 文档存放路径
 * @param markdown 文档的 Markdown 格式内容
 * @returns 返回一个 Promise，resolve 后为新建文档的 ID（类型 DocumentId）
 */
export async function createDocWithMd(notebook: NotebookId, path: string, markdown: string): Promise<DocumentId> {
    let data = {
        notebook: notebook,
        path: path,
        markdown: markdown,
    };
    let url = '/api/filetree/createDocWithMd';
    return request(url, data);
}

/**
 * 重命名文档
 * @param notebook 笔记本的 ID
 * @param path 文档的原始存放路径
 * @param title 新文档标题
 * @returns 返回一个 Promise，resolve 后为文档的新 ID（类型 DocumentId）
 */
export async function renameDoc(notebook: NotebookId, path: string, title: string): Promise<DocumentId> {
    let data = {
        doc: notebook, // 注意：此处传递的 key 名为 "doc"
        path: path,
        title: title
    };
    let url = '/api/filetree/renameDoc';
    return request(url, data);
}

/**
 * 删除文档
 * @param notebook 笔记本的 ID
 * @param path 文档所在路径
 * @returns 返回删除操作的结果
 */
export async function removeDoc(notebook: NotebookId, path: string) {
    let data = {
        notebook: notebook,
        path: path,
    };
    let url = '/api/filetree/removeDoc';
    return request(url, data);
}

/**
 * 移动多个文档到指定位置
 * @param fromPaths 要移动的文档路径数组
 * @param toNotebook 目标笔记本的 ID
 * @param toPath 目标存放路径
 * @returns 返回移动操作的结果
 */
export async function moveDocs(fromPaths: string[], toNotebook: NotebookId, toPath: string) {
    let data = {
        fromPaths: fromPaths,
        toNotebook: toNotebook,
        toPath: toPath
    };
    let url = '/api/filetree/moveDocs';
    return request(url, data);
}

/**
 * 根据路径获取文档的层级路径（HPath）
 * @param notebook 笔记本的 ID
 * @param path 文档路径
 * @returns 返回一个 Promise，resolve 后为层级路径字符串
 */
export async function getHPathByPath(notebook: NotebookId, path: string): Promise<string> {
    let data = {
        notebook: notebook,
        path: path
    };
    let url = '/api/filetree/getHPathByPath';
    return request(url, data);
}

/**
 * 根据区块 ID 获取对应的层级路径（HPath）
 * @param id 区块的 ID
 * @returns 返回一个 Promise，resolve 后为层级路径字符串
 */
export async function getHPathByID(id: BlockId): Promise<string> {
    let data = { id: id };
    let url = '/api/filetree/getHPathByID';
    return request(url, data);
}

/**
 * 根据文档的层级路径获取所有相关区块的 ID
 * @param notebook 笔记本的 ID
 * @param path 层级路径（HPath）
 * @returns 返回一个 Promise，resolve 后为区块 ID 数组
 */
export async function getIDsByHPath(notebook: NotebookId, path: string): Promise<BlockId[]> {
    let data = {
        notebook: notebook,
        path: path
    };
    let url = '/api/filetree/getIDsByHPath';
    return request(url, data);
}


// **************************************** Asset Files ****************************************

/**
 * 上传资源文件
 * @param assetsDirPath 资源存放的目录路径
 * @param files 包含要上传文件的数组
 * @returns 返回一个 Promise，resolve 后为上传操作结果（类型 IResUpload）
 */
export async function upload(assetsDirPath: string, files: any[]): Promise<IResUpload> {
    let form = new FormData(); // 创建 FormData 对象，用于构造多部分表单数据
    form.append('assetsDirPath', assetsDirPath);
    for (let file of files) {
        // 依次将文件添加到表单中，使用 'file[]' 表示上传数组形式的文件
        form.append('file[]', file);
    }
    let url = '/api/asset/upload';
    return request(url, form);
}


// **************************************** Block ****************************************

// 定义区块数据类型，可为 "markdown" 或 "dom"
type DataType = "markdown" | "dom";

/**
 * 插入新的区块
 * @param dataType 区块数据类型（"markdown" 或 "dom"）
 * @param data 区块具体内容
 * @param nextID （可选）下一个区块的 ID，控制插入位置
 * @param previousID （可选）上一个区块的 ID
 * @param parentID （可选）父区块的 ID，用于嵌套结构
 * @returns 返回一个 Promise，resolve 后为插入操作的结果数组（类型 IResdoOperations[]）
 */
export async function insertBlock(
    dataType: DataType, data: string,
    nextID?: BlockId, previousID?: BlockId, parentID?: BlockId
): Promise<IResdoOperations[]> {
    let payload = {
        dataType: dataType,
        data: data,
        nextID: nextID,
        previousID: previousID,
        parentID: parentID
    }
    let url = '/api/block/insertBlock';
    return request(url, payload);
}

/**
 * 在指定父区块或文档的最前面添加子区块
 * @param dataType 区块数据类型
 * @param data 区块内容
 * @param parentID 父区块或文档的 ID
 * @returns 返回一个 Promise，resolve 后为添加操作的结果数组
 */
export async function prependBlock(dataType: DataType, data: string, parentID: BlockId | DocumentId): Promise<IResdoOperations[]> {
    let payload = {
        dataType: dataType,
        data: data,
        parentID: parentID
    }
    let url = '/api/block/prependBlock';
    return request(url, payload);
}

/**
 * 在指定父区块或文档的末尾添加子区块
 * @param dataType 区块数据类型
 * @param data 区块内容
 * @param parentID 父区块或文档的 ID
 * @returns 返回一个 Promise，resolve 后为添加操作的结果数组
 */
export async function appendBlock(dataType: DataType, data: string, parentID: BlockId | DocumentId): Promise<IResdoOperations[]> {
    let payload = {
        dataType: dataType,
        data: data,
        parentID: parentID
    }
    let url = '/api/block/appendBlock';
    return request(url, payload);
}

/**
 * 更新指定区块的内容
 * @param dataType 区块数据类型
 * @param data 新的区块内容
 * @param id 需要更新的区块 ID
 * @returns 返回一个 Promise，resolve 后为更新操作的结果数组
 */
export async function updateBlock(dataType: DataType, data: string, id: BlockId): Promise<IResdoOperations[]> {
    let payload = {
        dataType: dataType,
        data: data,
        id: id
    }
    let url = '/api/block/updateBlock';
    return request(url, payload);
}

/**
 * 删除指定的区块
 * @param id 区块的 ID
 * @returns 返回一个 Promise，resolve 后为删除操作的结果数组
 */
export async function deleteBlock(id: BlockId): Promise<IResdoOperations[]> {
    let data = { id: id };
    let url = '/api/block/deleteBlock';
    return request(url, data);
}

/**
 * 移动区块到新的位置
 * @param id 要移动的区块的 ID
 * @param previousID （可选）目标位置前一个区块的 ID
 * @param parentID （可选）目标父区块或文档的 ID
 * @returns 返回一个 Promise，resolve 后为移动操作的结果数组
 */
export async function moveBlock(id: BlockId, previousID?: PreviousID, parentID?: ParentID): Promise<IResdoOperations[]> {
    let data = {
        id: id,
        previousID: previousID,
        parentID: parentID
    }
    let url = '/api/block/moveBlock';
    return request(url, data);
}

/**
 * 折叠指定区块（使其内容隐藏）
 * @param id 区块的 ID
 * @returns 返回折叠操作的结果
 */
export async function foldBlock(id: BlockId) {
    let data = { id: id };
    let url = '/api/block/foldBlock';
    return request(url, data);
}

/**
 * 展开（取消折叠）指定区块
 * @param id 区块的 ID
 * @returns 返回展开操作的结果
 */
export async function unfoldBlock(id: BlockId) {
    let data = { id: id };
    let url = '/api/block/unfoldBlock';
    return request(url, data);
}

/**
 * 获取指定区块的 Kramdown 格式内容
 * @param id 区块的 ID
 * @returns 返回一个 Promise，resolve 后为 Kramdown 格式数据（类型 IResGetBlockKramdown）
 */
export async function getBlockKramdown(id: BlockId): Promise<IResGetBlockKramdown> {
    let data = { id: id };
    let url = '/api/block/getBlockKramdown';
    return request(url, data);
}

/**
 * 获取指定区块的所有子区块信息
 * @param id 区块的 ID
 * @returns 返回一个 Promise，resolve 后为子区块信息数组（类型 IResGetChildBlock[]）
 */
export async function getChildBlocks(id: BlockId): Promise<IResGetChildBlock[]> {
    let data = { id: id };
    let url = '/api/block/getChildBlocks';
    return request(url, data);
}

/**
 * 转移区块引用，从一个区块转移到另一个区块
 * @param fromID 原始区块 ID
 * @param toID 目标区块 ID
 * @param refIDs 要转移的引用区块 ID 数组
 * @returns 返回转移操作的结果
 */
export async function transferBlockRef(fromID: BlockId, toID: BlockId, refIDs: BlockId[]) {
    let data = {
        fromID: fromID,
        toID: toID,
        refIDs: refIDs
    }
    let url = '/api/block/transferBlockRef';
    return request(url, data);
}


// **************************************** Attributes ****************************************

/**
 * 设置指定区块的属性
 * @param id 区块的 ID
 * @param attrs 属性对象，格式为 { key: value }，均为字符串
 * @returns 返回设置属性操作的结果
 */
export async function setBlockAttrs(id: BlockId, attrs: { [key: string]: string }) {
    let data = { id: id, attrs: attrs };
    let url = '/api/attr/setBlockAttrs';
    return request(url, data);
}

/**
 * 获取指定区块的所有属性
 * @param id 区块的 ID
 * @returns 返回一个 Promise，resolve 后为属性对象，键值均为字符串
 */
export async function getBlockAttrs(id: BlockId): Promise<{ [key: string]: string }> {
    let data = { id: id };
    let url = '/api/attr/getBlockAttrs';
    return request(url, data);
}


// **************************************** SQL ****************************************

/**
 * 执行 SQL 语句查询
 * @param sql 查询语句字符串
 * @returns 返回一个 Promise，resolve 后为查询结果数组
 */
export async function sql(sql: string): Promise<any[]> {
    let sqldata = { stmt: sql };
    let url = '/api/query/sql';
    return request(url, sqldata);
}

/**
 * 根据区块 ID 查询区块详情
 * @param blockId 区块的 ID 字符串
 * @returns 返回一个 Promise，resolve 后为查询到的区块对象（类型 Block）
 */
export async function getBlockByID(blockId: string): Promise<Block> {
    let sqlScript = `select * from blocks where id ='${blockId}'`;
    let data = await sql(sqlScript);
    return data[0];
}


// **************************************** Template ****************************************

/**
 * 渲染模板
 * @param id 文档的 ID
 * @param path 模板文件路径
 * @returns 返回一个 Promise，resolve 后为模板渲染结果（类型 IResGetTemplates）
 */
export async function render(id: DocumentId, path: string): Promise<IResGetTemplates> {
    let data = { id: id, path: path };
    let url = '/api/template/render';
    return request(url, data);
}

/**
 * 使用 Sprig 引擎渲染模板字符串
 * @param template 模板字符串
 * @returns 返回一个 Promise，resolve 后为渲染后的字符串结果
 */
export async function renderSprig(template: string): Promise<string> {
    let url = '/api/template/renderSprig';
    return request(url, { template: template });
}


// **************************************** File ****************************************

/**
 * 获取文件内容
 * @param path 文件路径
 * @returns 返回一个 Promise，resolve 后为文件内容（类型 any）
 */
export async function getFile(path: string): Promise<any> {
    let data = { path: path };
    let url = '/api/file/getFile';
    return new Promise((resolve, _) => {
        // 使用 fetchPost 发送请求，通过回调返回文件内容
        fetchPost(url, data, (content: any) => {
            resolve(content)
        });
    });
}

/**
 * 获取文件的 Blob 数据
 * 此函数通过 fetch 以 POST 方式请求文件，并返回 Blob 对象
 * @param path 文件路径
 * @returns 如果请求成功，返回 Blob，否则返回 null
 */
export const getFileBlob = async (path: string): Promise<Blob | null> => {
    const endpoint = '/api/file/getFile';
    let response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ path: path })
    });
    if (!response.ok) {
        return null;
    }
    let data = await response.blob();
    return data;
}

/**
 * 上传或创建文件/目录
 * @param path 要创建或上传的文件/目录路径
 * @param isDir 布尔值，表示是否为目录（true 为目录）
 * @param file 文件数据，通常为 File 对象
 * @returns 返回一个 Promise，resolve 后为上传操作的结果
 */
export async function putFile(path: string, isDir: boolean, file: any) {
    let form = new FormData();
    form.append('path', path);
    form.append('isDir', isDir.toString());
    // 添加修改时间（Unix 时间戳，单位秒）
    form.append('modTime', Math.floor(Date.now() / 1000).toString());
    form.append('file', file);
    let url = '/api/file/putFile';
    return request(url, form);
}

/**
 * 删除文件或目录
 * @param path 文件或目录路径
 * @returns 返回删除操作的结果
 */
export async function removeFile(path: string) {
    let data = { path: path };
    let url = '/api/file/removeFile';
    return request(url, data);
}

/**
 * 读取目录内容
 * @param path 目录路径
 * @returns 返回一个 Promise，resolve 后为目录下文件和子目录列表（类型 IResReadDir）
 */
export async function readDir(path: string): Promise<IResReadDir> {
    let data = { path: path };
    let url = '/api/file/readDir';
    return request(url, data);
}


// **************************************** Export ****************************************

/**
 * 导出文档的 Markdown 内容
 * @param id 文档的 ID
 * @returns 返回一个 Promise，resolve 后为 Markdown 内容数据（类型 IResExportMdContent）
 */
export async function exportMdContent(id: DocumentId): Promise<IResExportMdContent> {
    let data = { id: id };
    let url = '/api/export/exportMdContent';
    return request(url, data);
}

/**
 * 导出资源文件
 * @param paths 资源文件的路径数组
 * @param name 导出包的名称
 * @returns 返回一个 Promise，resolve 后为导出操作的结果（类型 IResExportResources）
 */
export async function exportResources(paths: string[], name: string): Promise<IResExportResources> {
    let data = { paths: paths, name: name };
    let url = '/api/export/exportResources';
    return request(url, data);
}


// **************************************** Convert ****************************************

/**
 * 使用 Pandoc 执行文件格式转换
 * @param args 一个字符串数组，包含 Pandoc 转换所需的参数
 * @returns 返回一个 Promise，resolve 后为转换后的结果
 */
export type PandocArgs = string;
export async function pandoc(args: PandocArgs[]) {
    let data = { args: args };
    let url = '/api/convert/pandoc';
    return request(url, data);
}


// **************************************** Notification ****************************************

/**
 * 推送普通通知消息
 * @param msg 显示的消息文本
 * @param timeout 消息显示时长（默认 7000 毫秒）
 * @returns 返回推送通知的结果
 */
export async function pushMsg(msg: string, timeout: number = 7000) {
    let payload = { msg: msg, timeout: timeout };
    let url = "/api/notification/pushMsg";
    return request(url, payload);
}

/**
 * 推送错误提示信息
 * @param msg 错误消息文本
 * @param timeout 消息显示时长（默认 7000 毫秒）
 * @returns 返回推送错误通知的结果
 */
export async function pushErrMsg(msg: string, timeout: number = 7000) {
    let payload = { msg: msg, timeout: timeout };
    let url = "/api/notification/pushErrMsg";
    return request(url, payload);
}


// **************************************** Network ****************************************

/**
 * 通过代理转发网络请求
 * @param url 目标请求的 URL 地址
 * @param method HTTP 请求方法（默认为 'GET'）
 * @param payload 请求发送的数据，默认为空对象
 * @param headers 请求头数组，可用于设置自定义请求头
 * @param timeout 请求超时时长（默认 7000 毫秒）
 * @param contentType 请求数据的内容类型（默认 "text/html"）
 * @returns 返回一个 Promise，resolve 后为代理请求结果（类型 IResForwardProxy）
 */
export async function forwardProxy(
    url: string, method: string = 'GET', payload: any = {},
    headers: any[] = [], timeout: number = 7000, contentType: string = "text/html"
): Promise<IResForwardProxy> {
    let data = {
        url: url,
        method: method,
        timeout: timeout,
        contentType: contentType,
        headers: headers,
        payload: payload
    }
    let url1 = '/api/network/forwardProxy';
    return request(url1, data);
}


// **************************************** System ****************************************

/**
 * 获取系统启动过程中的进度信息
 * @returns 返回一个 Promise，resolve 后为进度数据（类型 IResBootProgress）
 */
export async function bootProgress(): Promise<IResBootProgress> {
    return request('/api/system/bootProgress', {});
}

/**
 * 获取当前系统版本
 * @returns 返回一个 Promise，resolve 后为系统版本号（字符串）
 */
export async function version(): Promise<string> {
    return request('/api/system/version', {});
}

/**
 * 获取当前系统时间（时间戳，单位毫秒）
 * @returns 返回一个 Promise，resolve 后为当前时间戳
 */
export async function currentTime(): Promise<number> {
    return request('/api/system/currentTime', {});
}
