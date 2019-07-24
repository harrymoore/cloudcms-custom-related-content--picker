(function($) {

    var Alpaca = $.alpaca;

    if (!Alpaca.Fields) {
        Alpaca.Fields = {};
    }

    Alpaca.Fields.MMRelatedContentPickerField = Alpaca.Fields.AbstractGitanaPickerField.extend(
    /**
     * @lends Alpaca.Fields.MMRelatedContentPickerField.prototype
     */
    {
        getFieldType: function()
        {
            return "mm-related-content-picker";
        },

        validateItem: function(item, callback)
        {
            var self = this;

            self.loadByRef(item.ref, function(err, o) {
                if (err) {
                    return callback({
                        "message" : self.view.getMessage("invalidBranchId"),
                        "status" : false
                    });
                }

                callback({
                    "status": true
                });
            });
        },

        generateItem: function(picked)
        {
            var self = this;
            var item = self.base(picked);

            return item;
        },

        acquireTitle: function(item, callback)
        {
            var self = this;

            self.acquireTitle(item, callback);
        },

        loadByRef: function(ref, callback)
        {
            var self = this;

            var id = ref.substring(ref.lastIndexOf("/") + 1);

            Chain(self.context.branch).trap(function(error) {
                callback(error);
                return false;
            }).readNode(id).then(function() {
                callback(null, this);
            });
        },

        pickerConfiguration: function()
        {
            var self = this;
            return self.pickerConfiguration();
        },

        getTitle: function() {
            return "Related Content Picker Field";
        },

        getDescription: function() {
            return "Field for uploading or selecting an image and applying an alt text to new images";
        }
    });

    Alpaca.registerMessages({
        "invalidStackID": "A node does not exist with this ID"
    });


    Alpaca.registerFieldClass("mm-related-content-picker", Alpaca.Fields.MMRelatedContentPickerField);

})(jQuery);