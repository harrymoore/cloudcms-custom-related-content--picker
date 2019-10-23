define(function (require, exports, module) {

    var $ = require("jquery");
    var Alpaca = require("alpaca");
    var OneTeam = require("oneteam");
    var Actions = require("ratchet/actions");

    Alpaca.Fields.MMRelatedContentField = Alpaca.Fields.UploadField.extend({
        setup: function () {

            var self = this;

            self.options.hideDeleteButton = true;

            this.base();

            var hasRemove = false;
            if (self.options.buttons && self.options.buttons.length > 0) {
                for (var i = 0; i < self.options.buttons.length; i++) {
                    if (self.options.buttons[i].key === "remove") {
                        hasRemove = true;
                    }
                }
            }

            if (!hasRemove) {
                self.options.buttons.push({
                    "key": "remove",
                    "buttonClass": "btn-default",
                    "iconClass": "glyphicon glyphicon-white glyphicon-remove"
                });
            }

            if (!self.options.parameters) {
                self.options.parameters = {};
            }
            self.options.parameters["rootNodeId"] = "root";
            self.options.parameters["parentFolderPath"] = "/";
            self.options.showUploadPreview = false;
            if (!self.options.upload) {
                self.options.upload = {};
            }
            if (typeof (self.options.upload.processQueue) == "undefined") {
                self.options.upload.processQueue = [];
            }
            self.options.upload.url = "/proxy" + self.observable("branch").get().getUri() + "/nodes";
            self.options.upload.method = "POST";
            self.options.upload.autoUpload = true;
            if (typeof (self.options.upload.maxFileSize) === "undefined") {
                self.options.upload.maxFileSize = 25000000;
            }
            if (typeof (self.options.upload.maxNumberOfFiles) === "undefined") {
                self.options.upload.maxNumberOfFiles = 10;
            }

            self.options.upload.showSubmitButton = false;

            if (!self.options.uploadPath) {
                self.options.uploadPath = self.observable("path").get();
            }

            if (self.options.uploadPath) {
                self.options.parameters["parentFolderPath"] = self.options.uploadPath;
            }

            self.options.errorHandler = function (data) {

                var message = "An error occurred";

                if (Alpaca.isArray(data)) {
                    message = data.join(", ");
                    data = {};
                    data.errorThrown = message;
                }
                else if (data._response && data._response.jqXHR && data._response.jqXHR.responseJSON) {
                    message = data._response.jqXHR.responseJSON.message;
                }
                else if (data.errorThrown) {
                    message = data.errorThrown;
                }

                // adjust errorThrown to ensure it's as accurate as possible
                data.errorThrown = message;

                OneTeam.showError(message, function () {

                });
            };

            // relator support
            if (self.schema._relator) {
                if (!self.options.properties) {
                    self.options.properties = {};
                }
                self.options.properties["_type"] = self.schema._relator.nodeType || "n:node";

                // some data cleanup for relators
                var i = 0;
                do {
                    if (i < self.data.length) {
                        if (Alpaca.isObject(self.data[i]) && Alpaca.countProperties(self.data[i]) === 0) {
                            self.data.splice(i, 1);
                        }
                        else {
                            i++;
                        }
                    }
                }
                while (i < self.data.length);
            }

            // make sure we have a dataloader
            self.loadNodeFn = Alpaca.acquireBranchDataLoader(self);
        },

        handleValidate: function () {
            var self = this;
            var baseStatus = this.base();
            var valInfo = this.validation;
            var status = true;

            $(self.getControlEl()).find("[data-fileid]").each(function () {
                if (!!!this.value) {
                    status = false;
                    // $(this).addClass("alpaca-invalid");
                    $(this).css({ "border-color": "#f04124" });
                } else {
                    $(this).css({ "border-color": "" });
                }
            });

            valInfo["missingAlt"] = {
                "message": status ? "" : "Image files require an alt text",
                "status": status
            };

            return baseStatus && valInfo["missingAlt"]["status"];
        },

        prepareControlModel: function (callback) {
            var self = this;

            self.base(function (model) {

                model.selectFromExistingMessage = self.options.selectFromExistingMessage;
                if (!model.selectFromExistingMessage) {
                    model.selectFromExistingMessage = self.getMessage("selectFromExistingMultiple");
                    if (model.options.maxNumberOfFiles === 1) {
                        model.selectFromExistingMessage = self.getMessage("selectFromExistingSingle");
                    }
                }

                callback(model);
            });
        },

        observableHolder: function () {
            // find top-most parent
            var parent = this;
            while (parent.parent) {
                parent = parent.parent;
            }

            return parent.options.observableHolder;
        },

        bindRemoveButtons: function (el) {
            var self = this;

            // rebind all of the "remove" buttons
            window.setTimeout(function () {

                if (!window.location.href.endsWith('/properties')) {
                    $("[data-fileid]").hide();
                }

                $(self.getControlEl()).find("[data-fileid]").change(function () {
                    // $("[data-fileid]").change(function () {
                    var target = this;
                    var altTextValue = target.value;
                    var nodeId = $(target).attr('data-fileid');
                    // var node = self.nodes[nodeId];

                    // patch the node with new altText
                    if (nodeId) {
                        var branch = self.observable("branch").get();
                        Chain(branch).readNode(nodeId).then(function () {
                            var node = this;
                            node.patch([{
                                op: "add",
                                path: "/altText",
                                value: altTextValue
                            }]).then(function () {
                                // console.log("Applied patch to update altText");
                                // refresh validation state
                                self.refreshValidationState();
                            });
                        })
                    }
                });

                $(el).find("button.remove").off().click(function (e) {

                    e.preventDefault();

                    var fileIndex = $(this).attr("data-file-index");

                    // remove from DOM
                    var template = $(this).closest('.template-download');
                    template.remove();

                    // shift DOM elements data-file-index attribute back
                    var array = self.getValueAsArray();
                    if (array.length > 0) {
                        for (var x = fileIndex; x < array.length; x++) {
                            $(el).find("button[data-file-index='" + (x + 1) + "']").attr("data-file-index", x);
                        }
                    }

                    // remove from files
                    if (array && array.length > 0) {
                        array.splice(fileIndex, 1);
                        self.setValueAsArray(array);
                    }


                    // refresh validation state
                    self.refreshValidationState();

                    // refresh the ui state
                    self.refreshUIState();

                });

            }, 250);
        },

        observable: function (key) {
            return this.observableHolder().observable(key);
        },

        applyBindings: function (fileUpload, el) {
            var self = this;

            fileUpload.bind("fileuploadfail", function (e, data) {

                //stop default behaviour!
                //prevents from populating the form when the upload function fails. Just shows the error message on a modal and takes back to the original state.
                e.preventDefault();

            });

            fileUpload.bindFirst("fileuploadalways", function (e, data) {

                // rebind all of the "remove" buttons
                self.bindRemoveButtons.call(self, el);
            });

            $(el).find("button.select-button").off().click(function (e) {

                e.preventDefault();

                var actionContext = {};
                actionContext.project = self.observable("project").get();
                actionContext.branch = self.observable("branch").get();
                actionContext.path = self.options.uploadPath;
                actionContext.parentEl = el;
                self.startAction("select-document", actionContext, function (err, selected) {

                    if (selected) {
                        var documentId = selected._doc;

                        self.loadNodeFn(documentId, function (err, node) {

                            if (err) {
                                return;
                            }

                            self.nodes[node._doc] = node;

                            var descriptor = {
                                "id": node.getId(),
                                "ref": self.getRef(node),
                                "title": node.title ? node.title : node._doc,
                                "qname": node.getQName(),
                                "typeQName": node.getTypeQName(),
                                "alt": node.altText || ""
                            };

                            var descriptors = self.getValueAsArray();
                            if (!descriptors) {
                                descriptors = [];
                            }

                            // if descriptors is a string, we do a lazy convert
                            if (descriptors && typeof (descriptors) === "string") {
                                descriptors = [];
                            }

                            // insert at front
                            descriptors.unshift(descriptor);

                            self.setValueAsArray(descriptors);

                            // toss these out
                            $(el).find("tbody.files > .template-download").remove();

                            // reload
                            self.reload(function () {

                                // rebind all of the "remove" buttons
                                self.bindRemoveButtons(el);

                                // refresh the ui state
                                self.refreshUIState();

                            });
                        });

                    }
                });

            });
        },

        nodes: [],

        enhanceFiles: function (fileUploadConfig, data) {
            var self = this;

            // remove any rows that are associations
            OneTeam.filterAssociationsFromUploadRows(data.result.rows);

            var project = self.observable("project").get();
            var branch = self.observable("branch").get();

            // convert to files
            var files = [];
            $.each(data.result.rows, function (index, gitanaResult) {
                self.nodes[gitanaResult._doc] = gitanaResult;

                var file = data.files[index];

                var thumbnailUrl = self.options.upload.url + "/" + gitanaResult["_doc"] + "/preview/icon64?size=64&mimetype=image/jpeg";
                var deleteUrl = self.options.upload.url + "/" + gitanaResult["_doc"];

                var browseUrl = "/#/projects/" + project._doc + "/documents/" + gitanaResult["_doc"];
                browseUrl = OneTeam.injectWidIntoLiveUri(browseUrl, branch._doc);

                var newPath = file.name;
                if (self.options.parentFolderPath) {
                    newPath = self.options.parentFolderPath + "/" + newPath;
                }

                files.push({
                    "id": gitanaResult["_doc"],
                    "name": file.name,
                    "size": file.size,
                    "alt": file.alt,
                    "type": file.type,
                    "path": newPath,
                    "url": browseUrl,
                    "thumbnailUrl": thumbnailUrl,
                    "deleteUrl": deleteUrl,
                    "deleteType": "DELETE"
                });
            });

            data.result.files = files;
        },

        /**
         * Cloud CMS Node descriptor is like:
         *
         *      {
         *          "id": nodeId,
         *          "ref": ref,
         *          "title": "",
         *          "qname": "",
         *          "typeQName": ""
         *      }
         *
         * @param file
         */
        convertFileToDescriptor: function (file, callback) {
            var self = this;

            self.loadNodeFn(file.id, function (err, node) {

                if (err) {
                    return callback(err, null);
                }

                var descriptor = {
                    "id": node.getId(),
                    "ref": self.getRef(node),
                    "title": node.title ? node.title : node._doc,
                    "qname": node.getQName(),
                    "typeQName": node.getTypeQName(),
                    "alt": node.altText || ""
                };

                callback(null, descriptor);
            });
        },

        /**
         * This assumes the current branch.  Uses the node id to look up the node.
         *
         * @param descriptor
         * @param callback
         */
        convertDescriptorToFile: function (descriptor, callback) {
            var self = this;

            var nodeId = descriptor.id;
            if (!nodeId) {
                return callback({
                    "message": "Node ID not found on descriptor"
                });
            }

            var project = self.observable("project").get();
            var branch = self.observable("branch").get();

            // load node
            self.loadNodeFn(nodeId, function (err, node) {

                if (err) {
                    return callback(err, null);
                }

                var name = node.title;
                var size = 0;
                var type = "";
                var alt = node.altText || "";

                var attachment = node.listAttachments(false)["default"];
                if (attachment) {
                    size = attachment.length;
                    type = attachment.contentType;
                }

                // thumbnail url with preview fallback
                var thumbnailUrl = OneTeam.iconUriForNode(node, {
                    "size": 64,
                    "name": "picker"
                });

                var deleteUrl = "/proxy" + node.getUri();

                var browseUrl = "/#/projects/" + project._doc + "/documents/" + node._doc;
                browseUrl = OneTeam.injectWidIntoLiveUri(browseUrl, branch._doc);

                var file = {
                    "id": node.getId(),
                    "name": name,
                    "size": size,
                    "name": name,
                    "alt": alt,
                    "type": type,
                    "url": browseUrl,
                    "thumbnailUrl": thumbnailUrl,
                    "deleteUrl": deleteUrl,
                    "deleteType": "DELETE"
                };

                callback(null, file);
            });
        },

        afterPreload: function (fileUpload, el, files, callback) {
            var self = this;

            self.base(fileUpload, el, files, function () {

                self.bindRemoveButtons(el);

                callback();

            });
        },

        startAction: function (actionId, actionContext, callback) {
            var self = this;

            if (typeof (actionContext) === "function") {
                callback = actionContext;
                actionContext = {};
            }

            actionContext.observable = this.observableHolder().observable;

            // look up the action configuration
            var actionConfig = Actions.config(actionId);
            if (actionConfig) {
                // execute the action
                Actions.execute(actionId, actionConfig, actionContext, function (err, result) {
                    if (callback) {
                        callback(err, result);
                    }
                });

                return false;
            }
        },

        /**
         * @see Alpaca.ControlField#getFieldType
         */
        getFieldType: function () {
            return "mm-related-content";
        },

        refreshButtons: function (enabled) {
            var self = this;

            self.base(enabled);

            // disable the select existing buttons
            $(self.control).find(".btn.select-button").prop("disabled", true);
            $(self.control).find(".btn.select-button").attr("disabled", "disabled");

            if (enabled) {
                // enable select files button
                $(self.control).find(".btn.select-button").prop("disabled", false);
                $(self.control).find(".btn.select-button").attr("disabled", null);
            }
        },

        render: function (view, callback) {
            this.base(view, function () {
                callback();
            });
        },

        refreshUIState: function () {
            var self = this;
            this.base();

            if (self.isDisplayOnly()) {
                $(self.control).find("p.dropzone-message").hide();
                $(self.control).find(".container-fluid > .row:first-child").hide();
                $(self.control).find(".container-fluid > .row:nth-child(3)").hide();
            }
        },

        getRef: function (node) {
            var platform = this.observable("platform").get();
            var repository = this.observable("repository").get();
            var branch = this.observable("branch").get();

            return "node://" + platform.getId() + "/" + repository.getId() + "/" + branch.getId() + "/" + node.getId();
        },

        //  may need to override these methods:
        // getUploadTemplate: function() {
        //     return this.wrapTemplate("control-upload-partial-upload");
        // },

        /**
         * Gets the download template.
         */
        getDownloadTemplate: function () {
            return this.wrapTemplate("control-mm-related-content-partial-download");
        }

    });

    var TEMPLATE = ' \
    <div class="alpaca-fileupload-container {{#if cssClasses}}{{cssClasses}}{{/if}}"> \
        <div class="container-fluid"> \
            <div class="row"> \
                <div class="col-md-12"> \
                    <div class="btn-group"> \
                        <span class="btn btn-default fileinput-button"> \
                            <i class="glyphicon glyphicon-upload"></i> \
                            <span class="fileupload-add-button">{{chooseButtonLabel}}</span> \
                            <input class="alpaca-fileupload-input" type="file" name="{{name}}_files"> \
                            <input class="alpaca-fileupload-input-hidden" type="hidden" name="{{name}}_files_hidden"> \
                        </span> \
                        <button class="btn btn-default select-button"> \
                            <i class="glyphicon glyphicon-plus-sign"></i> \
                            <span>{{selectFromExistingMessage}}</span> \
                        </button> \
                    </div> \
                </div> \
            </div> \
            <div class="row alpaca-fileupload-well"> \
                <div class="col-md-12 fileupload-active-zone"> \
                    <table class="table table-striped"> \
                        <tbody class="files"> \
                        </tbody> \
                    </table> \
                    <p align="center" class="dropzone-message">{{dropZoneMessage}}</p> \
                </div> \
            </div> \
            <div class="row"> \
                <div class="col-md-12"> \
                    <div id="progress" class="progress"> \
                        <div class="progress-bar progress-bar-success"></div> \
                    </div> \
                </div> \
            </div> \
        </div> \
    </div> \
';

    var TEMPLATE_DOWNLOAD = ' \
    <tr class="template-download"> \
    {{#if file.error}} \
        <td></td> \
        <td class="name"> \
            <span>{{file.name}}</span> \
        </td> \
        <td class="size"> \
            <span>{{file.size}}</span> \
        </td> \
        <td class="alt" colspan="2"> \
            <input type="text" name="alt" required data-fileid="{{file.id}}" value="{{file.alt}}"></input> \
        </td> \
        <td class="error"> \
            Error: \
            {{file.error}} \
        </td> \
    {{else}} \
        <td class="preview"> \
            {{#if file.thumbnailUrl}} \
            <a href="{{file.url}}" title="{{file.name}}" data-gallery="gallery" download="{{file.name}}"> \
                <img src="{{file.thumbnailUrl}}"> \
            </a> \
            {{/if}} \
        </td> \
        <td class="name"> \
            <a href="{{file.url}}" title="{{file.name}}" data-gallery="{{file.thumbnailUrl}}gallery" download="{{file.name}}">{{file.name}}</a> \
        </td> \
        <td class="size"><span>{{file.size}}</span></td> \
        <td class="alt" colspan="2"><input type="text" name="alt" size="50" required data-fileid="{{file.id}}" value="{{file.alt}}"></input></td> \
    {{/if}} \
        <td> \
            {{#if buttons}} \
                {{#each buttons}} \
                    {{#if isDelete}} \
                        <button class="delete btn btn-danger" data-file-index="{{../fileIndex}}" data-button-key="{{key}}"> \
                            <i class="glyphicon glyphicon-trash glyphicon-white"></i> \
                        </button> \
                    {{else}} \
                        <button class="{{key}} btn {{buttonClass}}" data-file-index="{{../fileIndex}}" data-button-key="{{key}}"> \
                            {{#if iconClass}} \
                                <i class="{{iconClass}}"></i> \
                            {{/if}} \
                            {{#if label}} \
                                {{label}} \
                            {{/if}} \
                        </button> \
                    {{/if}} \
                {{/each}} \
            {{/if}} \
        </td> \
    </tr> \
';

    Alpaca.registerMessages({
        "selectFromExistingSingle": "Select an Existing File...",
        "selectFromExistingMultiple": "Select from Existing Files...",
        "altTextRequired": "Image alt text value required for all images"
    });

    Alpaca.registerTemplate("control-mm-related-content", TEMPLATE);
    Alpaca.registerTemplate("control-mm-related-content-partial-download", TEMPLATE_DOWNLOAD);

    Alpaca.registerFieldClass("mm-related-content", Alpaca.Fields.MMRelatedContentField);

});
