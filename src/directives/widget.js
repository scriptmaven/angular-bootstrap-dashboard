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

angular.module('ui.dashboard')
  .directive('widget', function ($injector) {

    return {

      controller: 'DashboardWidgetCtrl',

      link: function (scope) {

        var widget = scope.widget;
        // set up data source
        if (widget.dataModelType) {
          var DataModelConstructor; // data model constructor function

          if (typeof widget.dataModelType === 'function') {
            DataModelConstructor = widget.dataModelType;
          } else { // assume it is string
            $injector.invoke([widget.dataModelType, function (DataModelType) {
              DataModelConstructor = DataModelType;
            }]);
          }

          var ds;
          if (widget.dataModelArgs) {
            ds = new DataModelConstructor(widget.dataModelArgs);
          } else {
            ds = new DataModelConstructor();
          }
          widget.dataModel = ds;
          ds.setup(widget, scope);
          ds.init();
          scope.$on('$destroy', _.bind(ds.destroy,ds));
        }

        // Compile the widget template, emit add event
        scope.compileTemplate();
        scope.$emit('widgetAdded', widget);

      }

    };
  });