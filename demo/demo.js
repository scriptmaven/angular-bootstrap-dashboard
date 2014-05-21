/*
 * Copyright (c) 2014 DataTorrent, Inc. ALL Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

angular.module('app', [
    'ngRoute',
    'ui.dashboard'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'view.html',
        controller: 'DemoCtrl'
      })
      .when('/explicit-saving', {
        templateUrl: 'view.html',
        controller: 'ExplicitSaveDemoCtrl'
      })
      .when('/layouts', {
        templateUrl: 'layouts.html',
        controller: 'LayoutsDemoCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .factory('widgetDefinitions', function(RandomDataModel) {
    return [
      {
        name: 'random',
        directive: 'wt-scope-watch',
        attrs: {
          value: 'randomValue'
        }
      },
      {
        name: 'time',
        directive: 'wt-time'
      },
      {
        name: 'datamodel',
        directive: 'wt-scope-watch',
        dataAttrName: 'value',
        dataModelType: RandomDataModel
      }
    ];
  })
  .value('defaultWidgets', [
    { name: 'random' },
    { name: 'time' },
    { name: 'datamodel' },
    {
      name: 'random',
      style: {
        width: '50%'
      }
    },
    {
      name: 'time',
      style: {
        width: '50%'
      }
    }
  ])
  .controller('DemoCtrl', function ($scope, $interval, $window, widgetDefinitions, defaultWidgets) {
    
    $scope.dashboardOptions = {
      widgetButtons: true,
      widgetDefinitions: widgetDefinitions,
      defaultWidgets: defaultWidgets,
      storage: $window.localStorage,
      storageId: 'demo'
    };
    $scope.randomValue = Math.random();
    $interval(function () {
      $scope.randomValue = Math.random();
    }, 500);
  })
  .controller('ExplicitSaveDemoCtrl', function ($scope, $interval, $window, widgetDefinitions, defaultWidgets) {

    $scope.dashboardOptions = {
      widgetButtons: true,
      widgetDefinitions: widgetDefinitions,
      defaultWidgets: defaultWidgets,
      storage: $window.localStorage,
      storageId: 'explicitSave',
      explicitSave: true
    };
    $scope.randomValue = Math.random();
    $interval(function () {
      $scope.randomValue = Math.random();
    }, 500);
  })
  .factory('LayoutStorage', function() {

    function LayoutStorage(options) {

      angular.extend(options, { stringifyStorage: true }, options);

      this.id = options.storageId;
      this.storage = options.storage;
      this.storageHash = options.storageHash || '';
      this.stringify = options.stringifyStorage;
      this.widgetDefinitions = options.widgetDefinitions;
      this.defaultLayouts = options.defaultLayouts;
      
      this.layouts = [];
      this.states = {};
      this.load();
    }

    LayoutStorage.prototype = {

      add: function(layouts) {
        if ( !(layouts instanceof Array) ) {
          layouts = [layouts];
        }

        var self = this;

        angular.forEach(layouts, function(layout) {
          layout.dashboard = layout.dashboard || {};
          layout.dashboard.storage = self;
          layout.dashboard.storageId = layout.id = self.layouts.length + 1;
          layout.dashboard.widgetDefinitions = self.widgetDefinitions;
          layout.dashboard.stringifyStorage = false;
          self.layouts.push(layout);
        });
      },

      save: function() {

        var state = {
          layouts: this._serializeLayouts(),
          states: this.states,
          storageHash: this.storageHash
        };

        if (this.stringify) {
          state = JSON.stringify(state);
        }

        this.storage.setItem(this.id, state);
      },

      load: function() {

        var serialized = this.storage.getItem(this.id);

        if (serialized) {
          
          // check for promise
          if (typeof serialized === 'object' && typeof serialized.then === 'function') {
            this._handleAsyncLoad(serialized);
          }
           else {
            this._handleSyncLoad(serialized);
          }

        }

        else {
          this.add(this.defaultLayouts);
        }
      },

      setItem: function(id, value) {
        this.states[id] = value;
        this.save();
      },

      getItem: function(id) {
        return this.states[id];
      },

      removeItem: function(id) {
        delete this.states[id];
        this.save();
      },

      _serializeLayouts: function() {
        var result = [];
        angular.forEach(this.layouts, function(l) {
          result.push({
            title: l.title,
            id: l.id,
            active: l.active
          });
        });
        return result;
      },

      _handleSyncLoad: function(serialized) {
        
        var deserialized;

        if (this.stringify) {
          try {

            deserialized = JSON.parse(serialized);

          } catch (e) {

            this.add(this.defaultLayouts);
            return;
          }
        } else {

          deserialized = serialized;

        }

        if (this.storageHash !== deserialized.storageHash) {
          this.add(this.defaultLayouts);
          return;
        }
        this.states = deserialized.states;
        this.add(deserialized.layouts);
      },

      _handleAsyncLoad: function(promise) {
        var self = this;
        promise.then(
          this._handleSyncLoad,
          function() {
            self.add(self.defaultLayouts);
          }
        );
      }

    };
    return LayoutStorage;
  })
  .directive('dashboardLayouts', ['LayoutStorage', '$timeout', function(LayoutStorage, $timeout) {
    return {
      scope: true,
      templateUrl: 'template/dashboard-layouts.html',
      link: function(scope, element, attrs) {

        scope.options = scope.$eval(attrs.dashboardLayouts);

        var layoutStorage = new LayoutStorage(scope.options);

        scope.layouts = layoutStorage.layouts;

        scope.createNewLayout = function() {
          layoutStorage.add({ title: 'Custom', dashboard: { defaultWidgets: [] } });
        };

        scope.makeLayoutActive = function(layout) {
          angular.forEach(scope.layouts, function(l) {
            if (l !== layout) {
              l.active = false;
            } else {
              l.active = true;
            }
          });
          layoutStorage.save();
        };

        scope.isActive = function(layout) {
          return !! layout.active;
        };

        scope.editTitle = function (layout) {
          var input = element.find('input[data-layout="' + layout.id + '"]');
          layout.editingTitle = true;

          $timeout(function() {
            input.focus()[0].setSelectionRange(0, 9999);
          });
        };

        // saves whatever is in the title input as the new title
        scope.saveTitleEdit = function (layout) {
          layout.editingTitle = false;
          layoutStorage.save();
        };
      }
    };
  }])
  .controller('LayoutsDemoCtrl', function($scope, widgetDefinitions, defaultWidgets, LayoutStorage, $interval) {

    $scope.layoutOptions = {
      storageId: 'demo-layouts',
      storage: localStorage,
      storageHash: 'fs4df4d51',
      widgetDefinitions: widgetDefinitions,
      defaultLayouts: [
        { title: 'Layout 1', active: true , dashboard: {
          defaultWidgets: defaultWidgets
        }},
        { title: 'Layout 2', active: false, dashboard: {
          defaultWidgets: defaultWidgets
        } },
        { title: 'Layout 3', active: false, dashboard: {
          defaultWidgets: defaultWidgets
        } }
      ]
    };
    $scope.randomValue = Math.random();
    $interval(function () {
      $scope.randomValue = Math.random();
    }, 500);

  })
  .directive('wtTime', function ($interval) {
    return {
      restrict: 'A',
      scope: true,
      replace: true,
      template: '<div>Time<div class="alert alert-success">{{time}}</div></div>',
      link: function (scope) {
        function update() {
          scope.time = new Date().toLocaleTimeString();
        }

        update();

        var promise = $interval(update, 500);

        scope.$on('$destroy', function () {
          $interval.cancel(promise);
        });
      }
    };
  })
  .directive('wtScopeWatch', function () {
    return {
      restrict: 'A',
      replace: true,
      template: '<div>Value<div class="alert alert-info">{{value}}</div></div>',
      scope: {
        value: '=value'
      }
    };
  })
  .factory('RandomDataModel', function ($interval, WidgetDataModel) {
    function RandomDataModel() {
    }

    RandomDataModel.prototype = Object.create(WidgetDataModel.prototype);

    RandomDataModel.prototype.init = function () {
      this.updateScope('-');
      this.intervalPromise = $interval(function () {
        var value = Math.floor(Math.random() * 100);
        this.updateScope(value);
      }.bind(this), 500);
    };

    RandomDataModel.prototype.destroy = function () {
      WidgetDataModel.prototype.destroy.call(this);
      $interval.cancel(this.intervalPromise);
    };

    return RandomDataModel;
  });

