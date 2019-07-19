(function($) {

    var OneTeam = undefined;
    if (typeof(require) !== "undefined")
    {
        OneTeam = require("oneteam");
    }

    var picker = Ratchet.Gadgets.AbstractGitanaPicker.extend({

        /**
         * @override
         */
        configureDefault: function()
        {
            // call this first
            this.base();

            // update the config
            var c = {
                "columns": [{
                    "title": "Alt Text",
                    "property": "thumbnail",
                    "sort": true
                }, {
                    "title": "Title",
                    "property": "title",
                    "sort": true
                }, {
                    "title": "Alt Text",
                    "property": "altText",
                    "sort": false
                }]
            };

            if (typeof(OneTeam) !== "undefined")
            {
                c.icon = true;
            }

            this.config(c);
        },

        prepareModel: function(el, model, callback)
        {
            var self = this;

            this.base(el, model, function() {

                callback();
            });
        },


        doGitanaQuery: function(context, model, searchTerm, query, pagination, callback)
        {
            var self = this;
            
            self.doGitanaQuery(context, model, searchTerm, query, pagination, callback);
        },

        iconUri: function(row, model, context)
        {
            var self = this;
            
            return self.iconUri(row, model, context);
        },

        columnValue: function(row, item)
        {
            var self = this;
            
            return self.columnValue(row, item);
        }

    });

    Ratchet.GadgetRegistry.register("mm-node-picker", picker);

})(jQuery);