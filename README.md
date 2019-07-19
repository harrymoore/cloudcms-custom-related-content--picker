# mm-related-content-picker-field
Implement a custom relatec-content node picker for entering image alt text

Register as a module in Platform Settings.
module-id: mm-related-content-picker-field
URL: https://bitbucket.org/m38io/mm.cloudcms.admin/src/master/ui-modules/custom-related-content-picker
Path: /ui-modules/custom-node-picker

example usage in a form field:
    "fields": {
        "thumbnail": {
            "type": "mm-related-content-picker",
            "label": "...",
            "picker": {
                .
                .
                .
            }
        },
 