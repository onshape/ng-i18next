/*!
 * @onshape/ng-i18next - Version 0.3.15 - 2018-01-10
 * Copyright (c) 2018 Andre Meyering
 *
 * AngularJS filter and directive for i18next (i18next by Jan Mühlemann)
 *
 * - Source: https://github.com/i18next/ng-i18next/
 * - Issues: https://github.com/i18next/ng-i18next/issues
 *
 * License: MIT - https://github.com/i18next/ng-i18next/LICENSE
 *
*/
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

angular.module('jm.i18next').directive('ngI18next', ['$i18next', '$compile', '$parse', '$interpolate', function ($i18next, $compile, $parse, $interpolate) {

	'use strict';

	function parseOptions(options) {

		var res = {
			attr: 'text'
		};

		options = options.split(':');

		for (var i = 0; i < options.length; ++i) {
			if (options[i] === 'i18next') {
				res[options[i]] = true;
			} else {
				res.attr = options[i];
			}
		}

		return res;
	}

	function parseKey(key) {

		var options = {
				attr: 'text'
			},
			i18nOptions = '{}',
			tmp;

		key = key.trim();

		if (key.indexOf('[') === 0) {
			tmp = key.split(']');
			options = parseOptions(tmp.shift().substr(1).trim());
			key = tmp.join(']');
		}

		if (options.i18next && key.indexOf('(') === 0 && key.indexOf(')') >= 0) {
			tmp = key.split(')');
			key = tmp.pop().trim();
			i18nOptions = tmp.join(')').substr(1).trim();
		}

		return {
			key: key,
			options: options,
			i18nOptions: $parse(i18nOptions)
		};
	}

	function I18nextCtrl($scope, $element) {
		var argsUnregister;
		var stringUnregister;

		function parse(key) {
			var parsedKey = parseKey(key);

			// If there are watched values, unregister them
			if (argsUnregister) {
				argsUnregister();
			}
			if (stringUnregister) {
				stringUnregister();
			}

			function render(i18nOptions) {
				if (i18nOptions.sprintf) {
					i18nOptions.postProcess = 'sprintf';
				}

				var string = $i18next(parsedKey.key, i18nOptions);

				if (parsedKey.options.attr === 'html') {
					$element.empty().append(string);

					/*
					 * Now compile the content of the element and bind the variables to
					 * the scope
					 */
					$compile($element.contents())($scope);

					return;
				}

				if (stringUnregister) {
					stringUnregister();
				}

				var insertText = $element.text.bind($element);

				if (parsedKey.options.attr !== 'text') {
					insertText = $element.attr.bind($element, parsedKey.options.attr);
				}

				string = $interpolate(string);
				stringUnregister = $scope.$watch(string, insertText);
				insertText(string($scope));
			}

			argsUnregister = $scope.$watch(parsedKey.i18nOptions, render, true);
			render(parsedKey.i18nOptions($scope));
		}

		this.localize = function localize(key) {
			var keys = key.split(';');

			for (var i = 0; i < keys.length; ++i) {
				key = keys[i].trim();

				if (key === '') {
					continue;
				}

				parse(key);
			}

		};
	}

	return {

		// 'A': only as attribute
		restrict: 'A',

		scope: false,

		controller: ['$scope', '$element', I18nextCtrl],

		require: 'ngI18next',

		link: function postLink(scope, element, attrs, ctrl) {
			var translationValue = '';

			function observe(value) {
				translationValue = value.replace(/^\s+|\s+$/g, ''); // RegEx removes whitespace

				if (translationValue === '') {
					return setupWatcher();
				}

				ctrl.localize(translationValue);
			}

			function setupWatcher() {
				// Prevent from executing this method twice
				if (setupWatcher.done) {
					return;
				}

				// interpolate is allowing to transform {{expr}} into text
				var interpolation = $interpolate(element.html());

				scope.$watch(interpolation, observe);

				setupWatcher.done = true;
			}

			attrs.$observe('ngI18next', observe);

			scope.$on('i18nextLanguageChange', function () {
				ctrl.localize(translationValue);
			});
		}

	};

}]);

angular.module('jm.i18next').filter('i18next', ['$i18next', function ($i18next) {

	'use strict';

	function i18nextFilter(string, options) {

		return $i18next(string, options);

	}

	// https://docs.angularjs.org/guide/filter#stateful-filters
	i18nextFilter.$stateful = true;

	return i18nextFilter;

}]);
