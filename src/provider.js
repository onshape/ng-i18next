angular.module('jm.i18next', ['ng']);
angular.module('jm.i18next').provider('$i18next', function () {

	'use strict';

	var self = this,
		translations = {},
		globalOptions = null;

	self.options = {};
	self.i18n = {};
	self.$get = ['$rootScope', function ($rootScope) {

		function init() {

			if (window.i18next) {
				// assign instance of i18next
				self.i18n = window.i18next;
				self.options = window.i18next.options;
			} else {
					throw new Error('[ng-i18next] Can\'t find i18next and/or i18next options! Please refer to i18next.');
			}

			window.i18next.on('initialized', function (options) {
					self.options = options;
					$rootScope.$broadcast('i18nextLanguageChange', self.options.lng);
			});
		}

		function optionsChange(newOptions, oldOptions) {

			$i18nextTanslate.debugMsg.push(['i18next options changed:', oldOptions, newOptions]);

			globalOptions = newOptions;

			init();

		}

		/**
		 * Translates `key` with given options and puts the translation into `translations`.
		 * @param {Boolean} hasOwnOptions hasOwnOptions means that we are passing options to
		 *                                $i18next so we can't use previous saved translation.
		 */
		function translate(key, options, hasOwnOptions) {

			var lng = options.lng || 'auto';

			if (!translations[lng]) {
				translations[lng] = {};
			}

			if (!self.i18n) {

				translations[lng][key] = 'defaultLoadingValue' in options ? options.defaultLoadingValue :
					'defaultValue' in options ? options.defaultValue :
					'defaultLoadingValue' in globalOptions ? globalOptions.defaultLoadingValue : key;

			} else if (!translations[lng][key] || hasOwnOptions) {

				translations[lng][key] = self.i18n.t(key, options);

			}

		}

		function $i18nextTanslate(key, options) {

			var hasOwnOptions = !!options,
			    hasOwnNsOption = hasOwnOptions && options.ns,
			    hasGlobalNsObj = self.options && self.options.ns,
			    defaultOptions = self.options,
			    mergedOptions;

			// https://github.com/i18next/i18next/blob/e47bdb4d5528c752499b0209d829fde4e1cc96e7/src/i18next.translate.js#L232
			// Because of i18next read namespace from `options.ns`
			if (!hasOwnNsOption && hasGlobalNsObj) {
				defaultOptions = angular.copy(self.options);
				defaultOptions.ns = defaultOptions.defaultNs;
			}

			mergedOptions = hasOwnOptions ? angular.extend({}, defaultOptions, options) : defaultOptions;

			translate(key, mergedOptions, hasOwnOptions);

			// Fall back to the source string for not found ns strings
			var translatedString = translations[mergedOptions.lng] ? translations[mergedOptions.lng][key] : key;
			var nsseparator = mergedOptions.nsSeparator;
			var nsseparatorLength = nsseparator.length;
			var namedPlusSeparator = nsseparator;
			var nameSpaces = self.options.ns;
			for (var i = 0; i < nameSpaces.length; i++) {
				namedPlusSeparator = nameSpaces[i] + nsseparator;
				nsseparatorLength = namedPlusSeparator.length;
				if (translatedString && translatedString.indexOf(namedPlusSeparator) > -1) {
					translatedString = translatedString.substr(translatedString.indexOf(namedPlusSeparator) + nsseparatorLength);
				}
			}

			return !!mergedOptions.lng ? translatedString : translations['auto'][key];
		}

		$i18nextTanslate.debugMsg = [];

		$i18nextTanslate.options = self.options;

		if (self.options !== globalOptions) {
			optionsChange(self.options, globalOptions);
		}

		$i18nextTanslate.reInit = function () {
			optionsChange(globalOptions, globalOptions);
		};

		$rootScope.$watch(function () { return $i18nextTanslate.options; }, function (newOptions, oldOptions) {
			// Check whether there are new options and whether the new options are different from the old options.
			if (!!newOptions && oldOptions !== newOptions) {
				optionsChange(newOptions, oldOptions);
			}
		}, true);

		return $i18nextTanslate;

	}];

});
