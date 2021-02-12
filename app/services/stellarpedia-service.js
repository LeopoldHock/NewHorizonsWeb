//----------------------------------------------------------------------------//
// Leopold Hock / 2020-08-22
// Description:
// This service manages Stellarpedia.
//----------------------------------------------------------------------------//
import Ember from 'ember';
import Service from '@ember/service';
import ENV from 'new-horizons-web/config/environment';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class StellarpediaService extends Service {
    @service manager;
    @service store;
    @service localizationService;

    namespace = "/assets/stellarpedia/stellarpedia_";
    defaultEntry = { bookId: "basic-rules", chapterId: "introduction", entryId: "welcome" };
    @tracked data;
    @tracked header;
    @tracked selectedBookId;
    @tracked selectedChapterId;
    @tracked selectedEntry = {};
    @tracked currentPosition;
    @tracked returnRoute = "home";

    init() {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Initializer method.
        //----------------------------------------------------------------------------//
        super.init();
    }

    async load() {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Load and returns the Stellarpedia.
        //----------------------------------------------------------------------------//
        if (this.data) {
            return this.data;
        } else {
            let result = await this.store.findAll("stellarpedia");
            this.data = result;
            this.manager.log("Stellarpedia initialized.");
            return result;
        }
    }

    get(bookId, chapterId = undefined, entryId = undefined) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Returns a book and/or chapter and/or entry (chapterId and entryId are optional).
        //----------------------------------------------------------------------------//
        let that = this;
        bookId = this.manager.prepareId(bookId);
        // convert ids if needed
        if (chapterId) chapterId = this.manager.prepareId(chapterId);
        if (entryId) entryId = this.manager.prepareId(entryId);
        var book = this.store.peekRecord("stellarpedia", bookId);
        if (!book) {
            this.manager.log("Stellarpedia book " + bookId + " does not exist.", this.manager.msgType.e);
            return null;
        }
        // if chapterId is supplied, continue to look for chapter, else return book
        if (!chapterId) {
            return book;
        } else {
            let chapter;
            book.chapters.forEach(function (element, i) {
                if (element.id === chapterId) {
                    chapter = element;
                }
            });
            if (!chapter) {
                this.manager.log("Stellarpedia chapter " + bookId + "/" + chapterId + " does not exist.", this.manager.msgType.e);
                return null;
            }
            // if entryId is supplied, continue to look for entry, else return chapter
            if (!entryId) {
                return chapter;
            } else {
                let entry;
                chapter.entries.forEach(function (element, i) {
                    if (element.id === entryId) {
                        entry = element;
                    }
                })
                if (!entry) {
                    this.manager.log("Stellarpedia entry " + bookId + "/" + chapterId + "/" + entryId + " does not exist.", this.manager.msgType.e);
                    return null;
                }
                return entry;
            }
        }
    }

    getEntryHeader(entry, localize = true) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Returns an entry's header without tags.
        //----------------------------------------------------------------------------//
        if (entry.elements.length) {
            for (let i = 0; entry.elements.length; i++) {
                if (entry.elements[i].startsWith("[hdr]")) {
                    return this.prepareText(entry.elements[i]);
                }
            }
        }
        this.manager.log("Stellarpedia entry does not have a header element.");
        return null;
    }

    setSelectedEntry(bookId, chapterId, entryId) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Sets selectedEntry property.
        //----------------------------------------------------------------------------//
        try {
            let entry = this.get(bookId, chapterId, entryId);
            this.header = this.getEntryHeader(entry);
            this.selectedBookId = bookId;
            this.selectedChapterId = chapterId;
            this.selectedEntry = entry;
            this.currentPosition = this.manager.localize(bookId) + " > " + this.get(bookId, chapterId).header + " > " + this.header;
        } catch (exception) {
            this.manager.log("Unable to set Stellarpedia's selectedEntry (" + exception + ").", this.manager.msgType.x);
        }
    }

    getElementType(element, bookId = "", chapterId = "", entryId = "") {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Return an element's type
        // Available types are: 'hdr' (Header element), 'txt' (Text element), 'spt' (Separator element),
        // 'spc' (Spacer element), 'img' (Image element) and 'row' (Table row element).
        //----------------------------------------------------------------------------//
        // Header element
        if (element.startsWith("[hdr")) {
            return "hdr";
        }
        // Separator element
        else if (element.startsWith("[spt")) {
            return "spt";
        }
        // Spacer element
        else if (element.startsWith("[spc")) {
            return "spc";
        }
        // Text element
        else if (element.startsWith("[txt")) {
            return "txt";
        }
        // Image element
        else if (element.startsWith("[img")) {
            return "img";
        }
        // Table row element
        else if (element.startsWith("[row")) {
            return "row";
        }
        // Missing element
        else if (element.startsWith("[mis]")) {
            return "mis";
        }
        // Element type not recognizable
        else {
            this.manager.log("Type of Stellarpedia element not recognizable: " + element + " (" + bookId + "/" + chapterId + "/" + entryId + ")");
            return null;
        }
    }

    prepareElement(element) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Returns the processes version of an element depending on its type.
        //----------------------------------------------------------------------------//
        let type = this.getElementType(element);
        let result;
        switch (type) {
            case "hdr":
                result = element.substring(5, element.length);
                let localized = this.prepareText(element, true);
                if (!localized.startsWith("loc_miss:")) result = localized;
                break;
            case "txt":
                result = this.prepareText(element, true);
                break;
            case "img":
                result = this.getImageUrl(element);
                break;
            case "row":
                result = this.prepareRow(element);
                break;
            case "mis":
                result = "";
                break;
            default:
                result = element;
                break;
        }
        return result;
    }

    prepareText(element, isCurrentArcticle = false) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Returns the processed version of a text element.
        //----------------------------------------------------------------------------//
        if (isCurrentArcticle) {
            // for debugging purposes
            if (1 === 2) return;
        }
        // remove tag
        let result = element;
        let split = element.split("]");
        if (split.length >= 2) {
            result = split[1];
            if (split.length > 2) {
                // if split.length > 2, there are [] brackets being used in the actual text which have not been split at
                for (let i = 2; i < split.length; i++) {
                    result = result + "]";
                    if (split[i]) result = result + split[i];
                }
            }
            // first, try to localize the whole text as a whole
            let locResult = this.manager.localize(result, true);
            if (locResult) {
                result = locResult;
            }
            // if this fails, proceed to process the text
            else {
                result = this.processText(split[1], split[0]);
            }
        } else {
            // syntax or formatting error, throw exception
            this.manager.log("Syntax error in Stellarpedia element: " + element, this.manager.msgType.x);
        }
        return result;
    }

    processText(text, constructor = undefined) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-09-01
        // Description:
        // This method processes a raw Stellarpedia text and turns Stellarpedia tags
        // into HTML tags.
        //----------------------------------------------------------------------------//
        let result = text;
        // process constructor if it is supplied
        if (constructor) {
            let constructorSplit = constructor.split("(");
            if (constructorSplit[1]) {
                let paramsAsString = constructorSplit[1].replaceAll(/\)/g, "")
                let params = paramsAsString.split(";");
                for (let param of params) {
                    // check if parameter has a legit syntax
                    if (param.split("=").length === 2) {
                        // if color paramter is supplied
                        if (param.startsWith("col=")) {
                            let colorCode = param.split("=")[1];
                            result = "<p style='color:" + colorCode + "'>" + result + "</p>"
                        }
                    } else {
                        // else, throw error
                        this.manager.log("Parameter has invalid syntax: " + param, this.manager.msgType.x);
                    }
                }
            }
        }
        // replace <hl> tags
        result = result.replaceAll(/<hl>/g, "<b><span class='highlighted'>");
        result = result.replaceAll(/<\/hl>/g, "</span></b>");
        // replace \n tags
        result = result.replaceAll(/\\n/g, "<br>");
        // process <dt> tags
        let dataRegex = /<dt>(.*?)<\/dt>/g;
        let dataMatches = [...result.matchAll(dataRegex)];
        for (let dataMatch of dataMatches) {
            let dataPath = dataMatch[1];
            let dataResult = this.manager.database.getDataFromPath(dataPath);
            if (dataResult) {
                result = result.replace(dataMatch[0], dataResult);
            } else {
                result = result.replace(dataMatch[0], "data_miss::" + dataPath);
            }
        }
        // process <lc> tags
        let locRegex = /<lc>(.*?)<\/lc>/g;
        let locMatches = [...result.matchAll(locRegex)];
        for (let locMatch of locMatches) {
            result = result.replace(locMatch[0], this.manager.localize(locMatch[1]))
        }
        // process <link> tags
        let linkRegex = /<link=(.*?)<\/link>/g;
        let linkMatches = [...result.matchAll(linkRegex)];
        for (let linkMatch of linkMatches) {
            let linkPath = linkMatch[1].split("\">")[0];
            let linkText = linkMatch[1].split("\">")[1];
            if (!linkText) linkText = "";
            // if link contains an actual URL, replace with <a href=url>
            if (linkPath.startsWith("http") || linkPath.startsWith("mailto")) {
                result = result.replace(linkMatch[0], "<a href='" + linkPath + "'>" + linkText + "</a>");
            }
            // if not, extract article information and replace with <button>
            else {
                let entryUrl = this.manager.prepareId(linkPath);
                entryUrl = entryUrl.replaceAll(/\"/g, "");
                result = result.replace(linkMatch[0], "<button type'button' class='stellarpedia-link' data-target='" + entryUrl + "'>" + linkText + "</button>");
            }
        }
        return result;
    }

    prepareRow(element) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-26
        // Description:
        // This method processes a table row element. Returns rowData object.
        //----------------------------------------------------------------------------//
        // remove tag
        let result = element;
        let split = element.split("]");
        if (split.length >= 2) {
            result = split[1];
            if (split.length > 2) {
                // if split.length > 2, there are [] brackets being used in the actual text which have not been split at
                for (let i = 2; i < split.length; i++) {
                    result = result + "]";
                    if (split[i]) result = result + split[i];
                }
            }
            let rowData = { isHeader: false, isLast: false, layout: [], alignment: [], content: [] };
            // process constructor
            let constructor = split[0];
            let constructorSplit = constructor.split("(");
            if (constructorSplit[1]) {
                let paramsAsString = constructorSplit[1].replaceAll(/\)/g, "")
                let params = paramsAsString.split(";");
                for (let param of params) {
                    // check if parameter has a legit syntax
                    if (param.split("=").length === 2) {
                        let argument = param.split("=")[1];
                        // 'header' parameter
                        if (param.startsWith("header=")) {
                            if (argument === "true") rowData.isHeader = true;
                        }
                        // 'last' parameter
                        else if (param.startsWith("last=")) {
                            if (argument === "true") rowData.isLast = true;
                        }
                        // 'layout' parameter
                        else if (param.startsWith("layout=")) {
                            let args = argument.split(",");
                            for (let arg of args) {
                                if (parseInt(arg)) {
                                    rowData.layout.push(parseInt(arg));
                                } else {
                                    // throw error due to invalid argument
                                    this.manager.log("Invalid argument '" + arg + "' for parameter 'layout' in Stellarpedia element: " + element, this.manager.msgType.x);
                                }
                            }
                        }
                        // 'alignment' parameter
                        else if (param.startsWith("alignment=")) {
                            let args = argument.split(",");
                            for (let arg of args) {
                                if (arg === "l" || arg === "c" || arg === "r") {
                                    rowData.alignment.push(arg);
                                } else {
                                    // throw error due to invalid argument
                                    this.manager.log("Invalid argument '" + arg + "' for parameter 'alignment' in Stellarpedia element: " + element, this.manager.msgType.x);
                                }
                            }
                        }
                        // else, throw error due to unknown parameter
                        else {
                            this.manager.log("Unknown paramer '" + param.split("=")[0] + "' in Stellarpedia element: " + element, this.manager.msgType.x);
                        }
                    } else {
                        // else, throw error
                        this.manager.log("Parameter has invalid syntax: " + param, this.manager.msgType.x);
                    }
                }
                // process cell content
                let cells = result.split("||");
                for (let cell of cells) {
                    rowData.content.push(cell);
                }
            }
            result = rowData;
        } else {
            // syntax or formatting error, throw exception
            this.manager.log("Syntax error in Stellarpedia element: " + element, this.manager.msgType.x);
        }
        return result;
    }

    getImageUrl(element) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-26
        // Description:
        // This image processes an image element and returns the image's url.
        //----------------------------------------------------------------------------//
        let result = element;
        let split = element.split("]");
        if (split.length > 1) {
            let url = ENV.APP.stellarpediaUrl + split[1].slice(13, split[1].length) + ".png";
            return url;
        } else {
            this.manager.log("Syntax error in Stellarpedia element: " + element, this.manager.msgType.x);
            return undefined;
        }
    }

    getImageSubtitle(element) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-26
        // Description:
        // This image processes an image element and returns its subtitle.
        //----------------------------------------------------------------------------//
        let result = element;
        let split = element.split("]");
        if (split.length >= 1) {
            let constructorSplit = split[0].split("(");
            if (constructorSplit.length > 1) {
                let subtitleParam = constructorSplit[1].split("=");
                if (subtitleParam.length > 1) {
                    let subtitle = subtitleParam[1];
                    // remove last char (closed ')')
                    subtitle = subtitle.slice(0, -1);
                    return subtitle;
                } else {
                    this.manager.log("Parameter has invalid syntax: " + param, this.manager.msgType.x);
                    return undefined;
                }
            } else {
                return "";
            }
        } else {
            this.manager.log("Syntax error in Stellarpedia element: " + element, this.manager.msgType.x);
            return undefined;
        }
    }
}