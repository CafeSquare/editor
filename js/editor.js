(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Model = {};

module.exports = Model;

},{}],2:[function(require,module,exports){
'use strict';

var _ = (window._),
    Definition = require('./helper/Definition'),
    Model = require('./Model'),
    ModelDefinition = {};

ModelDefinition.extend = function (override) {

    function check(override) {
        if (_.has(override, 'name') || _.has(override, 'type')) {
            throw 'ModelDefinition: *name*, and *type* fields are reserved and should not be overridden';
        }
    }

    if ('debug') {
        check(override);
    }

    var definition = new Definition(false, override),
        pre = definition.extend;

    definition.extend = function (override) {
        if ('debug') {
            check(override);
        }
        return pre.call(this, override);
    };

    return definition;
};

// Transform Model Definitions into Model's
ModelDefinition.populateModel = function () {

    if ('debug') {
        if (!_.isEmpty(Model)) {
            throw 'Model variable isn\'t empty: Use ModelDefinition for defining models';
        }
    }

    // Add *name* field to each ModelDefinition
    _.each(ModelDefinition, function (definition, definitionName) {
        if (definition instanceof Definition) {
            definition.name = definitionName;
        }
    });

    // Create Model's
    _.each(ModelDefinition, function (definition, definitionName) {
        var model, visual;
        if (definition instanceof Definition) {
            model = _.omit(definition, 'type', 'value', '_parent', '_value', 'extend');
            visual = { title: definition.name + ': No Title', description: '', screenshot: 'http://placehold.it/200&text=' + encodeURIComponent(definition.name + ': No Image') };
            model.type = definition._parent.name || false;
            model.value = definition._value();
            model.visual = _.defaults(model.visual || {}, visual);
            Model[definitionName] = model;
        }
    });
};

module.exports = ModelDefinition;

},{"./Model":1,"./helper/Definition":102}],3:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Model = require('./Model');

var Visual = React.createClass({
    displayName: 'Visual',

    getDefaultProps: function getDefaultProps() {
        return {
            model: undefined,
            onChange: function onChange(value) {}
        };
    },
    render: function render() {

        var model = this.props.model,
            typeName;

        if (typeof model == 'undefined') {
            //console.error('visual: no *model* property was specified', this.props);
            var noBlockStyle = {
                height: '100px',
                lineHeight: '100px',
                textAlign: 'center',
                fontSize: '30px',
                backgroundColor: 'lightgray'
            };
            return Visual.renderMethod === 'renderForEdit' ? React.createElement(
                'div',
                { style: noBlockStyle },
                'Error: missing or corrupted block'
            ) : null;
        }

        // Debugging
        if (!_.has(Model, model.name)) {
            console.error('visual: invalid model name', model.name, model);
        }

        // Try to find editor in the following order:
        // 1) Visual[model.name],
        // 2) Visual[model.type],
        // 3) Visual[model.type.type],
        // 4) ...
        for (typeName = model.name; typeName; typeName = Model[typeName].type) {
            if (_.has(Visual, typeName)) {
                return React.createElement(Visual[typeName], this.props);
            }
        }

        console.error('visual: no editor for model', model.name, model);
        return React.createElement(
            'p',
            null,
            'no editor for ',
            React.createElement(
                'b',
                null,
                model.name
            )
        );
    }
});

Visual.renderMethod = 'renderForEdit';

module.exports = Visual;

},{"./Model":1}],4:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    deepExtend = require('deep-extend'),
    Vi = require('./mixin/Vi'),
    Definition = require('./helper/Definition'),
    Model = require('./Model'),
    Visual = require('./Visual'),
    VisualDefinition = {};

VisualDefinition.extend = function (override) {

    var NewVisualDefinition = {

        mixins: [Vi],

        // It is forbidden to use getDefaultProps method. The following
        // hash should be used instead.
        defaultProps: {},

        render: function render() {
            if (Visual.renderMethod != 'renderForEdit' && Visual.renderMethod != 'renderForView') {
                throw 'VisualDefinition: invalid renderMethod [' + Visual.renderMethod + ']';
            }
            return this[Visual.renderMethod](this.value(), this._Vi);
        },
        renderForEdit: function renderForEdit(v, Vi) {
            throw 'renderForEdit: Not Implemented';
        },
        renderForView: function renderForView(v, Vi) {
            return this.renderForEdit(v, Vi);
        },

        // Helpers

        value: function value() {
            return this.props.contextValue ? deepExtend({}, this.props.value, this.props.contextValue) : this.props.value;
        },

        handleChange: function handleChange(propertyName, propertyValue) {
            //console.log('handleChange', this._displayName, propertyName, propertyValue);

            if ('debug') {
                if (arguments.length != 2) {
                    console.error(this._displayName + '.handleChange: should take 2 arguments: propertyName and propertyValue', arguments);
                    return;
                }
            }

            var u = {},
                p = u;

            // propertyName can be in the form name1.name2.name3
            // which is this.value()[name1][name2][name3]
            _.each(propertyName.split('.'), function (v) {
                p = p[v] = {};
            });

            p['$set'] = propertyValue;
            this.props.onChange(React.addons.update(this.props.value, u));
        },

        // Use this method to getting a list of properties to
        // transfer to the Visual child node
        propsExclude: function propsExclude() {
            return _.omit(this.props, 'model', 'value', 'onChange', arguments);
        }

    };

    var definition = new Definition(false, NewVisualDefinition),
        pre = definition.extend;

    // When VisualDefinition is extended, its *mixin* property
    // should be appended instead of overridden.
    function extend(override) {
        var mixins = [];
        var defaultProps = _.extend({}, this.defaultProps, override.defaultProps);
        _.each(this.mixins, function (v) {
            mixins.push(v);
        });
        _.each(override.mixins, function (v) {
            mixins.push(v);
        });
        return pre.call(this, _.extend({}, override, { mixins: mixins, defaultProps: defaultProps }));
    }

    definition.extend = extend;

    return definition.extend(override);
};

// Transform Visual Definitions into React Elements
VisualDefinition.populateVisual = function () {
    _.each(VisualDefinition, function (definition, key) {
        if (definition instanceof Definition) {

            if (Visual.renderMethod != 'renderForEdit' && Visual.renderMethod != 'renderForView') {
                throw 'VisualDefinition[' + key + ']: invalid renderMethod [' + Visual.renderMethod + ']';
            }

            if (!_.has(Model, key)) {
                console.error('VisualDefinition[' + key + ']: Model[' + key + '] is not defined');
            }

            if (_.has(definition, 'getDefaultProps')) {
                console.error('VisualDefinition[' + key + ']: VisualDefinition shouldn\'t have getDefaultProps method, use defaultProps instead');
            }

            if (_.has(definition.defaultProps, 'value')) {
                console.error('VisualDefinition[' + key + ']: defaultProps.value is used by Visual');
            }

            if (_.has(definition.defaultProps, 'onChange')) {
                console.error('VisualDefinition[' + key + ']: defaultProps.onChange is used by Visual');
            }

            Visual[key] = React.createClass(_.extend({}, _.omit(definition, '_parent'), {

                // This is for debugging.
                displayName: 'Visual.' + key,
                _displayName: 'Visual.' + key,

                // Used by mixin/Vi, and VisualContainer
                _model: Model[key],

                // This method can be defined on this step only since at the time VisualDefinition
                // is defined no Model's have ben created.
                getDefaultProps: function getDefaultProps() {
                    return _.extend({}, definition.defaultProps, {
                        value: Model[key].value,
                        onChange: function onChange(value) {}
                    });
                }

            }));
        }
    });
};

module.exports = VisualDefinition;

},{"./Model":1,"./Visual":3,"./helper/Definition":102,"./mixin/Vi":134,"deep-extend":"deep-extend"}],5:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React);

var Draggable = React.createClass({
	displayName: 'Draggable',

	getInitialState: function getInitialState() {
		return {
			startTop: false,
			startLeft: false
		};
	},
	getDefaultProps: function getDefaultProps() {
		return {
			onDragStart: function onDragStart(draggable) {},
			onDragEnd: function onDragEnd(draggable) {},
			onDragMove: function onDragMove(offset, draggable) {}
		};
	},
	handleMouseDown: function handleMouseDown(before, after, event) {
		// FIXME ugly hack
		if (jQuery(event.target).hasClass('visual-sidebar-block-remove')) {
			before(event);
			after(event);
			return;
		}
		before(event);
		jQuery(window).on('mousemove', this.handleMouseMove);
		jQuery(window).on('mouseup', this.handleMouseUp);
		this.setState({ startLeft: event.clientX, startTop: event.clientY });
		this.props.onDragStart(this);
		after(event);
	},
	handleMouseUp: function handleMouseUp(event) {
		jQuery(window).off('mousemove', this.handleMouseMove);
		jQuery(window).off('mouseup', this.handleMouseUp);
		this.props.onDragEnd(this);
	},
	handleMouseMove: function handleMouseMove(event) {
		var offset = {
			top: event.clientY - this.state.startTop,
			left: event.clientX - this.state.startLeft
		};
		this.props.onDragMove(offset, this);
		event.preventDefault();
	},
	render: function render() {
		var nop = function nop() {},
		    child = React.Children.only(this.props.children),
		    props = _.omit(this.props, 'children');
		return React.addons.cloneWithProps(child, _.extend(props, {
			onMouseDown: this.handleMouseDown.bind(null, child.props.onMouseDown || nop, this.props.onMouseDown || nop)
		}));
	}
});

module.exports = Draggable;

},{}],6:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = (window.React);
var _ = (window._);
var UrlUtils = require('../helper/utils/UrlUtils');
var PagesListener = require('../mixin/PagesListener');

var Link = React.createClass({
    displayName: 'Link',

    mixins: [PagesListener],
    mixinPageListenerShouldUpdate: function mixinPageListenerShouldUpdate() {
        // rerender only if the href has changed
        return this._href !== this.getHref();
    },
    getHref: function getHref() {
        return this.props.href ? UrlUtils.url(this.props.href) : null;
    },
    getTarget: function getTarget() {
        // blank only for external links
        return !this.props.href || UrlUtils.isInternalPage(this.props.href) ? null : '_blank';
    },
    render: function render() {
        var selectedProps = {
            href: this.getHref(),
            target: this.getTarget()
        };

        this._href = selectedProps.href;

        return React.createElement(
            'a',
            _extends({}, selectedProps, _.omit(this.props, 'href')),
            this.props.children
        );
    }
});

module.exports = Link;

},{"../helper/utils/UrlUtils":129,"../mixin/PagesListener":133}],7:[function(require,module,exports){
'use strict';

var React = (window.React);
var jQuery = (window.jQuery);
var Notifications = require('../../global/Notifications');

var Notification = React.createClass({
    displayName: 'Notification',

    componentDidMount: function componentDidMount() {

        // setting a timeout and adding a class to make the animation work
        setTimeout((function () {
            jQuery(this.getDOMNode()).addClass('visual-notification-animating');
        }).bind(this), 200);

        if (this.props.dismissible) {
            this.timeout1 = setTimeout(this.dismiss, this.props.autoDismissAfter);
        }
    },

    dismiss: function dismiss() {

        // canceling the auto dismiss in case it was forced
        clearTimeout(this.timeout1);

        // removing the class to trigger the animation backward
        jQuery(this.getDOMNode()).removeClass('visual-notification-animating');

        // setting a timeout before disposing so the backward animation would finish
        this.timeout2 = setTimeout(this.props.onDismiss, 3000);
    },

    componentWillUnmount: function componentWillUnmount() {
        clearTimeout(this.timeout1);
        clearTimeout(this.timeout2);
    },

    render: function render() {
        var type;
        switch (this.props.type) {
            case Notifications.notificationTypes.success:
                type = 'success';
                break;
            case Notifications.notificationTypes.error:
                type = 'error';
                break;
            default:
                type = 'success';
        }

        var dismissBtn = this.props.dismissible ? React.createElement('div', { className: 'visual-notification-dismiss', onClick: this.dismiss }) : null,
            dismissClassName = this.props.dismissible ? ' visual-notification-dismissible' : '';

        return React.createElement(
            'div',
            { className: 'visual-notification visual-notification-' + type + dismissClassName },
            React.createElement(
                'p',
                null,
                this.props.text
            ),
            dismissBtn
        );
    }

});

module.exports = Notification;

},{"../../global/Notifications":97}],8:[function(require,module,exports){
'use strict';

var _ = (window._);
var React = (window.React);
var Notifications = require('../../global/Notifications');
var Notification = require('./Notification');

function getNotifications() {
	return {
		notifications: Notifications.getNotifications()
	};
}

var Component = React.createClass({

	displayName: 'Notifications',

	getInitialState: function getInitialState() {
		return getNotifications();
	},

	componentDidMount: function componentDidMount() {
		Notifications.addChangeListener(this._onChange);
	},

	componentWillUnmount: function componentWillUnmount() {
		Notifications.removeChangeListener(this._onChange);
	},

	_onChange: function _onChange() {
		this.setState(getNotifications());
	},

	handleDismiss: function handleDismiss(id) {
		Notifications.removeNotification(id);
	},

	render: function render() {
		var notifications = _.map(this.state.notifications, (function (notification) {
			return React.createElement(Notification, {
				key: notification.id,
				type: notification.type,
				text: notification.text,
				dismissible: notification.dismissible,
				autoDismissAfter: notification.autoDismissAfter,
				onDismiss: this.handleDismiss.bind(null, notification.id)
			});
		}).bind(this));

		return React.createElement(
			'div',
			null,
			this.props.children,
			notifications
		);
	}
});

module.exports = Component;

},{"../../global/Notifications":97,"./Notification":7}],9:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    TreeView = require('../../basic/TreeView');

var Handlers = React.createClass({
	displayName: 'Handlers',

	getDefaultProps: function getDefaultProps() {
		return {
			onChange: function onChange() {}
		};
	},
	getIcon: function getIcon(name) {
		return React.createElement('i', { className: 'visual-icon-metric-' + name });
	},
	render: function render() {
		return React.createElement(TreeView, { data: this.props.tabsData, onChange: this.props.onChange,
			active: this.props.active, pre: this.getIcon });
	}
});

module.exports = Handlers;

},{"../../basic/TreeView":61}],10:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numberFormat = require('../metrics_format_helper').numberFormat,
    dateFormat = require('../metrics_format_helper').dateFormat,
    getTotalDescriptionByPeriod = require('../metrics_format_helper').getTotalDescriptionByPeriod,
    getChartIntervalLabel = require('../metrics_format_helper').getChartIntervalLabel,
    IntervalSelect = require('../basic/IntervalSelect'),
    TotalItem = require('../basic/TotalItem'),
    Table = require('../basic/Table'),
    LinearChart = require('../basic/LinearChart');

var Mobile = React.createClass({
	displayName: 'Mobile',

	getTableHead: function getTableHead() {
		return [{
			title: '',
			dataKey: 'date'
		}, {
			title: 'MOBILE',
			dataKey: 'mobile'
		}, {
			title: 'DESKTOP',
			dataKey: 'desktop'
		}];
	},
	getTableData: function getTableData() {
		var period = this.props.period;

		return _.map(this.props.data, function (item) {
			return {
				mobile: numberFormat(item.mobile),
				desktop: numberFormat(item.desktop),
				date: dateFormat(period, item.date)
			};
		});
	},
	getChartData: function getChartData() {
		var period = this.props.period;

		var result = {
			labels: [],
			data: [[], []]
		};

		_.each(this.props.data, function (item) {
			// labels
			result.labels.push(getChartIntervalLabel(period, item.date).toUpperCase());
			// desktop
			result.data[0].push(item.desktop);
			// mobile
			result.data[1].push(item.mobile);
		});

		return result;
	},
	render: function render() {
		var data = this.props.data;
		var description = getTotalDescriptionByPeriod(this.props.period);

		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-body' },
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-chart' },
					React.createElement(LinearChart, { data: this.getChartData() })
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-total' },
					React.createElement(TotalItem, {
						title: 'DESKTOP:',
						sumKey: 'desktop',
						data: data,
						description: description,
						addClass: 'visual-popup-metrics-total-item-blue'
					}),
					React.createElement(TotalItem, {
						title: 'MOBILE:',
						sumKey: 'mobile',
						data: data,
						description: description,
						addClass: 'visual-popup-metrics-total-item-green'
					})
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-table' },
					React.createElement(Table, { head: this.getTableHead(), data: this.getTableData(), addClass: 'visual-popup-metrics-table-traffic' })
				)
			)
		);
	}
});

module.exports = Mobile;

},{"../basic/IntervalSelect":16,"../basic/LinearChart":17,"../basic/Table":19,"../basic/TotalItem":20,"../metrics_format_helper":22}],11:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    getDataApi = require('../metrics_request_helper'),
    IntervalSelect = require('../basic/IntervalSelect');

var tabs = {
    traffic: require('./Traffic'),
    mobile: require('./Mobile'),
    refferers: require('./Refferers'),
    popular: require('./Popular'),
    search: require('./Search')
};

var TabPanel = React.createClass({
    displayName: 'TabPanel',

    getInitialState: function getInitialState() {
        return {
            period: 'day',
            data: null,
            isLoading: true
        };
    },
    componentDidMount: function componentDidMount() {
        this.makeRequest();
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (nextProps.active !== this.props.active) {
            this.makeRequest(nextProps.active);
        }
    },
    handleChangePeriod: function handleChangePeriod(value) {
        if (this.state.period !== value) {
            this.setState({
                period: value,
                data: null
            }, this.makeRequest);
        }
    },
    makeRequest: function makeRequest(active) {
        var _this = this;

        if (!this.state.isLoading) {
            this.setState({
                isLoading: true,
                data: null
            });
        }
        getDataApi({
            method: active || this.props.active,
            period: this.state.period,
            success: function success(data) {
                _this.setState({
                    isLoading: false,
                    data: data
                });
            },
            error: function error(data) {
                //console.error("error", data);
                _this.setState({
                    isLoading: false,
                    data: []
                });
            }
        });
    },
    getLoading: function getLoading() {
        if (this.state.isLoading) {
            return React.createElement(
                'div',
                { className: 'visual-popup-metrics-loading' },
                React.createElement(
                    'span',
                    null,
                    'Loading...'
                )
            );
        }
        return null;
    },
    showContent: function showContent() {
        var tab = tabs[this.props.active];
        var props = _.chain(this.state).pick('period', 'data').value();
        return _.isArray(this.state.data) && this.state.data.length == 0 ? React.createElement(
            'div',
            { className: 'visual-popup-metrics-body' },
            React.createElement(
                'div',
                { className: 'visual-alert visual-alert-error' },
                React.createElement(
                    'strong',
                    null,
                    'There is no data for selected period,  try to change period.'
                )
            )
        ) : React.createElement(tab, props);
    },
    render: function render() {

        var title = _.findWhere(this.props.tabsData, { id: this.props.active }).title;
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-tab-panel' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(IntervalSelect, { onChange: this.handleChangePeriod, selected: this.state.period }),
                React.createElement(
                    'h3',
                    null,
                    title
                )
            ),
            !this.state.isLoading ? this.showContent() : "",
            this.getLoading()
        );
    }
});

module.exports = TabPanel;

},{"../basic/IntervalSelect":16,"../metrics_request_helper":23,"./Mobile":10,"./Popular":12,"./Refferers":13,"./Search":14,"./Traffic":15}],12:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numeral = require('numeral'),
    numberFormat = require('../metrics_format_helper').numberFormat,
    dateFormat = require('../metrics_format_helper').dateFormat,
    getTotalDescriptionByPeriod = require('../metrics_format_helper').getTotalDescriptionByPeriod,
    IntervalSelect = require('../basic/IntervalSelect'),
    TotalItem = require('../basic/TotalItem'),
    Table = require('../basic/Table'),
    PieChart = require('../basic/PieChart');

var Popular = React.createClass({
	displayName: 'Popular',

	getTableHead: function getTableHead() {
		return [{
			title: 'COUNT',
			dataKey: 'count'
		}, {
			title: 'PAGE VIEWED',
			dataKey: 'page'
		}];
	},
	getData: function getData() {
		return _.sortBy(this.props.data, 'countVisits').reverse();
	},
	getTableData: function getTableData() {
		var _this = this;
		return _.map(this.getData(), function (item) {
			return {
				count: numberFormat(item.countVisits),
				page: _this.getPageLink(item.label)
			};
		});
	},
	getPageLink: function getPageLink(link) {
		return React.createElement(
			'a',
			{ href: '#' },
			link
		);
	},
	getChartData: function getChartData() {
		return _.map(this.getData(), function (item) {
			return {
				label: item.label,
				value: item.countVisits
			};
		});
	},
	render: function render() {
		var period = this.props.period;
		var data = this.getData();

		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-body' },
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-chart' },
					React.createElement(PieChart, { data: this.getChartData() })
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-total' },
					React.createElement(TotalItem, {
						title: 'TOTAL VIEWS:',
						sumKey: 'countVisits',
						data: data,
						description: getTotalDescriptionByPeriod(period)
					})
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-table' },
					React.createElement(Table, { head: this.getTableHead(), data: this.getTableData(), addClass: 'visual-popup-metrics-table-popular' })
				)
			)
		);
	}
});

module.exports = Popular;

},{"../basic/IntervalSelect":16,"../basic/PieChart":18,"../basic/Table":19,"../basic/TotalItem":20,"../metrics_format_helper":22,"numeral":"numeral"}],13:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numberFormat = require('../metrics_format_helper').numberFormat,
    getTotalDescriptionByPeriod = require('../metrics_format_helper').getTotalDescriptionByPeriod,
    IntervalSelect = require('../basic/IntervalSelect'),
    TotalItem = require('../basic/TotalItem'),
    Table = require('../basic/Table'),
    PieChart = require('../basic/PieChart');

var Refferers = React.createClass({
	displayName: 'Refferers',

	getTableHead: function getTableHead() {
		return [{
			title: 'COUNT',
			dataKey: 'count'
		}, {
			title: 'REFFERAL',
			dataKey: 'page'
		}];
	},
	getData: function getData() {
		return _.sortBy(this.props.data, 'count').reverse();
	},
	getTableData: function getTableData() {
		var _this = this;

		return _.map(this.getData(), function (item) {
			return {
				count: numberFormat(item.count),
				page: _this.getPageLink(item.label)
			};
		});
	},
	getChartData: function getChartData() {
		return _.map(this.getData(), function (item) {
			return {
				label: item.label,
				value: item.count
			};
		});
	},
	getPageLink: function getPageLink(link) {
		return React.createElement(
			'a',
			{ href: 'http://' + link, target: '_blank' },
			link
		);
	},
	render: function render() {
		var description = getTotalDescriptionByPeriod(this.props.period);
		var data = this.props.data;

		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-body' },
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-chart' },
					React.createElement(PieChart, { data: this.getChartData() })
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-total' },
					React.createElement(TotalItem, {
						title: 'VISITS:',
						sumKey: 'count',
						data: data,
						description: description,
						addClass: 'visual-popup-metrics-total-item-blue'
					})
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-table' },
					React.createElement(Table, { head: this.getTableHead(), data: this.getTableData(), addClass: 'visual-popup-metrics-table-refferers' })
				)
			)
		);
	}
});

module.exports = Refferers;

},{"../basic/IntervalSelect":16,"../basic/PieChart":18,"../basic/Table":19,"../basic/TotalItem":20,"../metrics_format_helper":22}],14:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numeral = require('numeral'),
    numberFormat = require('../metrics_format_helper').numberFormat,
    dateFormat = require('../metrics_format_helper').dateFormat,
    getTotalDescriptionByPeriod = require('../metrics_format_helper').getTotalDescriptionByPeriod,
    IntervalSelect = require('../basic/IntervalSelect'),
    TotalItem = require('../basic/TotalItem'),
    Table = require('../basic/Table'),
    PieChart = require('../basic/PieChart');

var Search = React.createClass({
    displayName: 'Search',

    getTableHead: function getTableHead() {
        return [{
            title: 'COUNT',
            dataKey: 'count'
        }, {
            title: 'QUERIES',
            dataKey: 'page'
        }];
    },
    getData: function getData() {
        return _.sortBy(this.props.data, 'countVisits').reverse();
    },
    getTableData: function getTableData() {
        var _this = this;

        return _.map(this.getData(), function (item) {
            return {
                count: numberFormat(item.countVisits),
                page: item.label
            };
        });
    },
    getChartData: function getChartData() {
        return _.map(this.getData(), function (item) {
            return {
                label: item.label,
                value: item.countVisits
            };
        });
    },
    render: function render() {
        var period = this.props.period;
        var data = this.props.data;
        return React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-body' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-chart' },
                    React.createElement(PieChart, { data: this.getChartData() })
                ),
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-total' },
                    React.createElement(TotalItem, {
                        title: 'TOTAL QUERIES:',
                        sumKey: 'countVisits',
                        data: data,
                        description: getTotalDescriptionByPeriod(period)
                    })
                ),
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-table' },
                    React.createElement(Table, { head: this.getTableHead(), data: this.getTableData(),
                        addClass: 'visual-popup-metrics-table-popular' })
                )
            )
        );
    }
});

module.exports = Search;

},{"../basic/IntervalSelect":16,"../basic/PieChart":18,"../basic/Table":19,"../basic/TotalItem":20,"../metrics_format_helper":22,"numeral":"numeral"}],15:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numberFormat = require('../metrics_format_helper').numberFormat,
    dateFormat = require('../metrics_format_helper').dateFormat,
    getTotalDescriptionByPeriod = require('../metrics_format_helper').getTotalDescriptionByPeriod,
    getChartIntervalLabel = require('../metrics_format_helper').getChartIntervalLabel,
    IntervalSelect = require('../basic/IntervalSelect'),
    TotalItem = require('../basic/TotalItem'),
    Table = require('../basic/Table'),
    LinearChart = require('../basic/LinearChart');

var Traffic = React.createClass({
	displayName: 'Traffic',

	getTableHead: function getTableHead() {
		return [{
			title: '',
			dataKey: 'date'
		}, {
			title: 'VISITS',
			dataKey: 'visits'
		}, {
			title: 'PAGE VIEWS',
			dataKey: 'pageView'
		}];
	},
	getTableData: function getTableData() {
		var period = this.props.period;

		return _.map(this.props.data, function (item) {
			return {
				visits: numberFormat(item.visits),
				pageView: numberFormat(item.pageView),
				date: dateFormat(period, item.date)
			};
		});
	},
	getChartData: function getChartData() {
		var period = this.props.period;

		var result = {
			labels: [],
			data: [[], []]
		};

		_.each(this.props.data, function (item) {
			// labels
			result.labels.push(getChartIntervalLabel(period, item.date).toUpperCase());
			// visits
			result.data[0].push(item.visits);
			// pageViews
			result.data[1].push(item.pageView);
		});

		return result;
	},
	render: function render() {
		var description = getTotalDescriptionByPeriod(this.props.period);
		var data = this.props.data;
		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-body' },
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-chart' },
					React.createElement(LinearChart, { data: this.getChartData() })
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-total' },
					React.createElement(TotalItem, {
						title: 'VISITS:',
						sumKey: 'visits',
						data: data,
						description: description,
						addClass: 'visual-popup-metrics-total-item-blue'
					}),
					React.createElement(TotalItem, {
						title: 'PAGE VIEWS:',
						sumKey: 'pageView',
						data: data,
						description: description,
						addClass: 'visual-popup-metrics-total-item-green'
					})
				),
				React.createElement(
					'div',
					{ className: 'visual-popup-metrics-table' },
					React.createElement(Table, { head: this.getTableHead(), data: this.getTableData(), addClass: 'visual-popup-metrics-table-traffic' })
				)
			)
		);
	}
});

module.exports = Traffic;

},{"../basic/IntervalSelect":16,"../basic/LinearChart":17,"../basic/Table":19,"../basic/TotalItem":20,"../metrics_format_helper":22}],16:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Select = require('../../../../../../../editor/js/component/controls/Select'),
    SelectItem = require('../../../../../../../editor/js/component/controls/Select/SelectItem');

var IntervalSelect = React.createClass({
	displayName: 'IntervalSelect',

	getDefaultProps: function getDefaultProps() {
		return {
			onChange: _.noop
		};
	},
	getInitialState: function getInitialState() {
		return {
			defaultValue: null
		};
	},
	componentWillMount: function componentWillMount() {
		if (this.props.selected) {
			this.onChange(this.props.selected);
		}
	},
	onChange: function onChange(value) {
		this.setState({
			defaultValue: value
		});

		this.props.onChange(value);
	},
	render: function render() {
		return React.createElement(
			Select,
			{
				className: 'visual-control-select-light',
				defaultValue: this.state.defaultValue,
				itemHeight: '45',
				maxItems: '3',
				onChange: this.onChange
			},
			React.createElement(
				SelectItem,
				{ key: 'day', value: 'day' },
				'Days'
			),
			React.createElement(
				SelectItem,
				{ key: 'week', value: 'week' },
				'Weeks'
			),
			React.createElement(
				SelectItem,
				{ key: 'month', value: 'month' },
				'Month'
			)
		);
	}
});

module.exports = IntervalSelect;

},{"../../../../../../../editor/js/component/controls/Select":86,"../../../../../../../editor/js/component/controls/Select/SelectItem":85}],17:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Chart = require('chart.js');

var COLORS = ['#219dd0', '#a0b751']; //ec0016 ec00b7
var FILL_COLORS = ['rgba(33,157,208, 0.15)', 'rgba(160,183,81, 0.15)']; //ec0016 ec00b7
//var COLORS = ['#219dd0', '#a0b751'];

var options = {
	datasetFill: true,
	bezierCurve: true,
	pointDotRadius: 4,
	datasetStrokeWidth: 2,
	pointDotStrokeWidth: 1,
	scaleFontColor: '#9ea9b1',
	tooltipFillColor: "rgba(3,8,15,0.9)",
	tooltipTitleFontColor: "#cccfd1",
	tooltipFontColor: "#a6a8aa",
	tooltipTitleFontSize: 12,
	tooltipFontSize: 12,
	scaleShowVerticalLines: false
};

// global
var chart;

var LineChart = React.createClass({
	displayName: 'LineChart',

	getDefaultProps: function getDefaultProps() {
		return {
			width: 730,
			height: 300
		};
	},
	componentDidMount: function componentDidMount() {
		this.updateChart();
	},
	componentDidUpdate: function componentDidUpdate() {
		this.updateChart();
	},
	componentWillUnmount: function componentWillUnmount() {
		chart.destroy();
	},

	updateChart: function updateChart() {
		var ctx = jQuery(this.getDOMNode()).children().get(0).getContext('2d');
		var data = this.props.data;

		var datasets = _.map(data.data, function (item, index) {
			return {
				pointColor: COLORS[index],
				strokeColor: COLORS[index],
				pointStrokeColor: '#fff',
				pointHighlightStroke: COLORS[index],
				pointHighlightFill: "#fff",
				fillColor: FILL_COLORS[index],
				data: item
			};
		});

		if (chart) {
			chart.clear();
			chart.destroy();
		}
		// hack. remake
		if (jQuery(this.getDOMNode()).closest(".visual-large-popup-body.active").get(0)) {
			chart = new Chart(ctx).Line({
				labels: data.labels,
				datasets: datasets
			}, options);
		}
	},
	render: function render() {
		return React.createElement(
			'div',
			null,
			React.createElement('canvas', { ref: 'canvas', width: this.props.width, height: this.props.height })
		);
	}
});

module.exports = LineChart;

},{"chart.js":"chart.js"}],18:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    numeral = require('numeral'),
    Chart = require('chart.js');

var COLORS = ['#62bcd9', '#8e7fd1', '#b1f9d8', '#79a5bd', '#d89ce1', '#dd9747', '#e7d26e', '#9cd6e2'];
var COLORS_H = ['#56b0d2', '#7a6cc9', '#a3f8d1', '#6996b1', '#d18bdc', '#d8843e', '#e2ca60', '#8bcfdd'];

var options = {
	segmentShowStroke: false,
	legendTemplate: ["<ul>", "<% var total = 0; for (var i=0; i<segments.length; i++){ total += segments[i].value; } %>", "<% for (var i=0; i<segments.length; i++){%>", "<li style=\"border-left-color: <%=segments[i].fillColor%>\">", "<strong class=\"value\" data-value=\"<%=100 * segments[i].value / total%>\">0,0%</strong>", "<span><a href=\"http://<%=segments[i].label%>\" target=\"_blank\"><%=segments[i].label%></a></span>", "</li>", "<%}%>", "</ul>"].join(''),
	animationEasing: 'easeOutSine'
};

// global
var chart;

var PieChart = React.createClass({
	displayName: 'PieChart',

	getDefaultProps: function getDefaultProps() {
		return {
			width: 250,
			height: 250
		};
	},
	componentDidMount: function componentDidMount() {
		this.updateChart();
	},
	componentDidUpdate: function componentDidUpdate() {
		this.updateChart();
	},
	componentWillUnmount: function componentWillUnmount() {
		chart.destroy();
	},
	updateChart: function updateChart() {
		var ctx = this.refs.canvas.getDOMNode().getContext('2d');
		var data = this.props.data;

		var collected_data;
		if (data.length > 8) {
			collected_data = data.slice(0, 7);
			collected_data.push({
				label: 'Others',
				value: _.reduce(data.slice(7), function (memo, item) {
					return memo + item.value;
				}, 0)
			});
		} else {
			collected_data = data;
		}

		var data_chart = _.map(collected_data, function (v, i) {
			return {
				color: COLORS[i],
				highlight: COLORS_H[i],
				value: v.value,
				label: v.label
			};
		});

		if (chart) {
			chart.destroy();
		}

		chart = new Chart(ctx).Pie(data_chart, options);

		jQuery(this.refs.legend.getDOMNode()).html(chart.generateLegend()).find('.value').each(function () {
			var num = Number($(this).data('value'));
			if (num) {
				$(this).text(numeral(num).format('0,0.00') + '%');
			}
		});
	},
	render: function render() {
		return React.createElement(
			'div',
			{ className: 'visual-popup-metrics-pie-chart' },
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-pie-chart-left' },
				React.createElement('canvas', { ref: 'canvas', width: this.props.width, height: this.props.height })
			),
			React.createElement('div', { className: 'visual-popup-metrics-pie-chart-legend', ref: 'legend' })
		);
	}
});

module.exports = PieChart;

},{"chart.js":"chart.js","numeral":"numeral"}],19:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numeral = require('numeral');

var Table = React.createClass({
	displayName: 'Table',

	getDefaultProps: function getDefaultProps() {
		return {
			head: function head() {},
			data: function data() {},
			addClass: ''
		};
	},
	getHead: function getHead() {
		var items = _.map(this.props.head, function (item) {
			return item.title ? React.createElement(
				'th',
				null,
				item.title
			) : React.createElement(
				'th',
				null,
				' '
			);
		});

		return React.createElement(
			'tr',
			null,
			items
		);
	},
	getBody: function getBody() {
		var keys = _.pluck(this.props.head, 'dataKey');

		return _.map(this.props.data, function (row) {
			return React.createElement(
				'tr',
				null,
				_.map(keys, function (key) {
					return React.createElement(
						'td',
						null,
						row[key]
					);
				})
			);
		});
	},
	render: function render() {
		return React.createElement(
			'table',
			{ className: 'visual-popup-metrics-sheet ' + this.props.addClass },
			React.createElement(
				'thead',
				null,
				this.getHead()
			),
			React.createElement(
				'tbody',
				null,
				this.getBody()
			)
		);
	}
});

module.exports = Table;

},{"numeral":"numeral"}],20:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    numberFormat = require('../metrics_format_helper').numberFormat;

var TotalItem = React.createClass({
	displayName: 'TotalItem',

	getDefaultProps: function getDefaultProps() {
		return {
			addClass: ''
		};
	},
	getTotalNumber: function getTotalNumber() {
		var sum = _.chain(this.props.data).pluck(this.props.sumKey).filter(function (num) {
			return typeof num === 'number';
		}).reduce(function (memo, num) {
			return memo + num;
		}, 0).value();

		return numberFormat(sum);
	},
	render: function render() {
		var props = this.props;
		return React.createElement(
			'div',
			{ className: 'visual-popup-metrics-total-item ' + props.addClass },
			React.createElement(
				'h4',
				null,
				props.title
			),
			React.createElement(
				'h3',
				null,
				this.getTotalNumber(props.count)
			),
			React.createElement(
				'p',
				null,
				props.description
			)
		);
	}
});

module.exports = TotalItem;

},{"../metrics_format_helper":22}],21:[function(require,module,exports){
'use strict';

var React = (window.React),
    ScrollPane = require('../../../../../../editor/js/component/ScrollPane'),
    TabHandlers = require('./Tabs/Handlers'),
    TabPanels = require('./Tabs/Panels');

var tabsData = [{
    id: 'traffic',
    title: 'Traffic Overview',
    icon: true
}, {
    id: 'mobile',
    title: 'Mobile Usage',
    icon: true
}, {
    id: 'popular',
    title: 'Popular Content',
    icon: true
}, {
    id: 'refferers',
    title: 'Referrers',
    icon: true
}, {
    id: 'search',
    title: 'Search Queries',
    icon: true
}];

var Metrics = React.createClass({
    displayName: 'Metrics',

    getInitialState: function getInitialState() {
        return {
            active_tab: 'traffic'
        };
    },
    handleTabChange: function handleTabChange(active) {
        this.setState({
            active_tab: active
        });
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics clearfix' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-left' },
                React.createElement(TabHandlers, { onChange: this.handleTabChange, active: this.state.active_tab, tabsData: tabsData })
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-content' },
                React.createElement(
                    ScrollPane,
                    { style: { height: '100%' } },
                    React.createElement(TabPanels, { active: this.state.active_tab, tabsData: tabsData })
                )
            )
        );
    }
});

module.exports = Metrics;

},{"../../../../../../editor/js/component/ScrollPane":64,"./Tabs/Handlers":9,"./Tabs/Panels":11}],22:[function(require,module,exports){
'use strict';

var numeral = require('numeral');

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var MONTH_NAMES_SHORT = ['Jan', 'Feb ', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var DESCRIPTIONS = {
	day: 'last 10 days',
	week: 'last 12 weeks',
	month: 'last 12 months'
};

var formatDate = {
	monthAndDate: function monthAndDate(date_str) {
		var date = new Date(Date.parse(date_str.replace(/from (.+?) to.*/i, "$1")));
		return MONTH_NAMES_SHORT[date.getMonth()] + " " + date.getDate();
	},
	monthShort: function monthShort(date_str) {
		var date = new Date(Date.parse(date_str));
		return MONTH_NAMES_SHORT[date.getMonth()];
	},
	month: function month(date_str) {
		var date = new Date(Date.parse(date_str));
		return MONTH_NAMES[date.getMonth()];
	},
	periodDate: function periodDate(date_str) {
		var dateFrom = new Date(Date.parse(date_str.replace(/from (.+?) to.*/i, "$1")));
		var dateTo = new Date(Date.parse(date_str.replace(/.*to (.+?)$/i, "$1")));
		return {
			dateFrom: MONTH_NAMES_SHORT[dateFrom.getMonth()] + " " + dateFrom.getDate(),
			dateTo: MONTH_NAMES_SHORT[dateTo.getMonth()] + " " + dateTo.getDate()
		};
	}
};

module.exports = {
	numberFormat: function numberFormat(num) {
		return numeral(num).format('0,0');
	},
	dateFormat: function dateFormat(period, date_str) {
		if (period === 'month') {
			return formatDate.month(date_str);
		} else if (period === 'week') {
			var date = formatDate.periodDate(date_str);
			return date.dateFrom;
		} else if (period === 'day') {
			return formatDate.monthAndDate(date_str);
		}
	},
	getChartIntervalLabel: function getChartIntervalLabel(period, date_str) {
		if (period === 'month') {
			return formatDate.monthShort(date_str);
		} else if (period === 'week') {
			return formatDate.monthAndDate(date_str);
		} else if (period === 'day') {
			return formatDate.monthAndDate(date_str);
		}
	},
	getTotalDescriptionByPeriod: function getTotalDescriptionByPeriod(period) {
		return DESCRIPTIONS[period];
	}
};

},{"numeral":"numeral"}],23:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);
var Config = require('../../../../../../editor/js/global/Config');

var INTERVAL = {
    day: 'last10',
    week: 'last12',
    month: 'last12'
};

var API_METHODS = {
    traffic: 'VisitsSummary',
    mobile: 'DevicesDetection',
    refferers: 'Referrers',
    popular: 'PopularContent',
    search: 'SearchEngineQueries'
};

var API_URL = '/app/access/analytics?url=';

module.exports = function (options) {

    function getProject() {
        return Config.get('project');
    }
    function getBaseHost() {
        return Config.get('baseUrl');
    }
    function getProjectHash() {
        return Config.get('projectsHash')['metrics'];
    }
    var url = 'api/' + API_METHODS[options.method] + '/period/' + options.period + '/date/' + INTERVAL[options.period] + '/project/' + getProject();

    jQuery.ajax({
        type: 'GET',
        url: getBaseHost() + API_URL + encodeURIComponent(url),
        success: function success(data) {
            options.success(data);
        },
        beforeSend: function beforeSend(request) {
            request.setRequestHeader('X-Signature-Hmac-SHA256', getProjectHash());
        },
        error: function error(_error) {
            options.error(_error);
        }
    });
};

},{"../../../../../../editor/js/global/Config":95}],24:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    ProjectUtils = require('../../../../../../../editor/js/helper/utils/ProjectUtils');

var AddNewPage = React.createClass({
    displayName: 'AddNewPage',

    getDefaultProps: function getDefaultProps() {
        return { onSubmit: function onSubmit() {} };
    },
    getInitialState: function getInitialState() {
        return { opened: false };
    },
    render: function render() {
        var content;

        if (this.state.opened) {
            content = React.createElement(
                'div',
                null,
                React.createElement('i', { className: 'visual-icon-nav-new-page' }),
                React.createElement('input', {
                    ref: 'input',
                    type: 'text',
                    placeholder: ProjectUtils.isMultiPage() ? 'Page Title' : 'Anchor Title',
                    onKeyUp: this.handleKeyUp,
                    onBlur: this.handleBlur
                }),
                React.createElement('button', { className: 'visual-icon-arrow-save', onMouseDown: this.submit })
            );
        } else {
            content = React.createElement(
                'a',
                { href: '#', className: 'visual-large-popup-navigation-add-page-link', onClick: this.handleClick },
                React.createElement('i', null),
                React.createElement(
                    'span',
                    null,
                    'Add New ',
                    ProjectUtils.isMultiPage() ? 'Page' : 'Anchor'
                )
            );
        }

        return React.createElement(
            'div',
            { className: 'visual-large-popup-navigation-add-page' },
            content
        );
    },
    handleBlur: function handleBlur() {
        this.close();
    },
    handleKeyUp: function handleKeyUp(e) {
        if (e.keyCode === 13) {
            // ENTER KEY
            this.submit();
        } else if (e.keyCode === 27) {
            // ESC KEY
            this.close();
        }
    },
    handleClick: function handleClick(e) {
        e.preventDefault();
        this.open();
    },
    submit: function submit() {
        var value = this.refs.input.getDOMNode().value;
        if (value) {
            this.props.onSubmit(value);
        }
        this.close();
    },
    open: function open() {
        this.setState({ opened: true }, function () {
            jQuery(this.refs.input.getDOMNode()).focus();
        });
    },
    close: function close() {
        this.setState({ opened: false });
    }
});

module.exports = AddNewPage;

},{"../../../../../../../editor/js/helper/utils/ProjectUtils":128}],25:[function(require,module,exports){
'use strict';

var React = (window.React);

var CheckBox = React.createClass({
    displayName: 'CheckBox',

    getDefaultProps: function getDefaultProps() {
        return {
            disabled: false
        };
    },
    getInitialState: function getInitialState() {
        return {
            checked: this.props.checked,
            disabled: this.props.disabled
        };
    },
    handleChange: function handleChange() {
        if (this.state.disabled) {
            return;
        }
        var checked = !this.state.checked;
        this.setState({
            checked: checked
        });
        this.props.onChange(checked);
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        var newState = {};
        if (this.state.checked !== nextProps.checked) {
            newState.checked = nextProps.checked;
        }
        if (this.state.disabled !== nextProps.disabled) {
            newState.disabled = nextProps.disabled;
        }
        this.setState(newState);
    },
    render: function render() {
        var className = 'visual-large-popup-navigation-field-checkbox';

        className += this.state.checked ? ' checked' : '';
        className += this.state.disabled ? ' disabled' : '';

        return React.createElement(
            'div',
            { className: className, onClick: this.handleChange },
            React.createElement('i', null),
            React.createElement(
                'span',
                { className: 'label' },
                this.props.label
            )
        );
    }
});

module.exports = CheckBox;

},{}],26:[function(require,module,exports){
'use strict';

var React = (window.React);

var RadioButton = React.createClass({
    displayName: 'RadioButton',

    handleChange: function handleChange() {
        if (!this.props.checked) {
            this.props.onChange();
        }
    },
    render: function render() {
        var className = 'visual-large-popup-navigation-field-radio' + (this.props.checked ? ' checked' : '');

        return React.createElement(
            'div',
            { className: className, onClick: this.handleChange },
            React.createElement('i', null),
            React.createElement(
                'span',
                { className: 'label' },
                this.props.label
            )
        );
    }
});

module.exports = RadioButton;

},{}],27:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Model = require('../../../../../../../../editor/js/Model'),
    SelectControl = require('../../../../../../../../editor/js/component/controls/Select'),
    SelectControlItem = require('../../../../../../../../editor/js/component/controls/Select/SelectItem'),
    getPageById = require('../../../../../../../../editor/js/global/Pages').getPageById,
    getActivePageId = require('../../../../../../../../editor/js/global/Router').getActivePageId;

var Select = React.createClass({
  displayName: 'Select',

  getCurrentPageBlocks: function getCurrentPageBlocks() {
    var activePageId = getActivePageId(),
        page = getPageById(activePageId);

    return page.data ? JSON.parse(page.data).container : [];
  },
  renderOptions: function renderOptions() {
    var currentPageBlocks = this.getCurrentPageBlocks(),
        blocksElements = _.map(currentPageBlocks, function (item) {
      var key = item.value.blockId,
          value = '#' + key,
          title = Model[item.type] ? Model[item.type].visual.title : 'Invalid Block';

      return React.createElement(
        SelectControlItem,
        { key: key, value: value },
        title
      );
    }, this);

    return [React.createElement(
      SelectControlItem,
      { key: 'not-selected' },
      'Not Selected'
    )].concat(blocksElements);
  },
  render: function render() {
    return React.createElement(
      SelectControl,
      { defaultValue: this.props.value, onChange: this.props.onChange },
      this.renderOptions()
    );
  }
});

module.exports = Select;

},{"../../../../../../../../editor/js/Model":1,"../../../../../../../../editor/js/component/controls/Select":86,"../../../../../../../../editor/js/component/controls/Select/SelectItem":85,"../../../../../../../../editor/js/global/Pages":98,"../../../../../../../../editor/js/global/Router":100}],28:[function(require,module,exports){
'use strict';

var React = (window.React);

var TextArea = React.createClass({
    displayName: 'TextArea',

    handleChange: function handleChange(event) {
        this.props.onChange(event.target.value);
    },
    render: function render() {
        return React.createElement('textarea', { onChange: this.handleChange, value: this.props.value });
    }
});

module.exports = TextArea;

},{}],29:[function(require,module,exports){
"use strict";

var React = (window.React);

var TextField = React.createClass({
    displayName: "TextField",

    handleChange: function handleChange() {
        this.props.onChange(this.getDOMNode().value);
    },
    render: function render() {
        return React.createElement("input", { value: this.props.value, onChange: this.handleChange, type: "text" });
    }
});

module.exports = TextField;

},{}],30:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    CheckBox = require('./CheckBox'),
    TextField = require('./TextField'),
    TextArea = require('./TextArea'),
    RadioButton = require('./RadioButton'),
    Select = require('./Select'),
    ProjectUtils = require('../../../../../../../../editor/js/helper/utils/ProjectUtils'),
    pageTypes = require('../../../../../../../../editor/js/global/Pages').pageTypes;

var PageSettings = React.createClass({
    displayName: 'PageSettings',

    getDefaultProps: function getDefaultProps() {
        return {
            page: null,
            onCancel: _.noop,
            onSave: _.noop,
            onDelete: _.noop
        };
    },
    getInitialState: function getInitialState() {
        return {
            title: '',
            description: '',
            slug: '',
            url: '',
            type: '',
            index: ''
        };
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (nextProps.page !== this.props.page) {
            var page = nextProps.page || {};
            this.setState({
                title: page.title,
                description: page.description,
                slug: page.slug,
                url: page.url,
                type: page.type,
                index: page.index,

                //needed for singlePage render
                urlAnchor: page.type === pageTypes.anchor ? page.url : '',
                urlExternal: page.type === pageTypes.external ? page.url : ''
            });
        }
    },
    setFieldValue: function setFieldValue(key, value) {
        var newState = {};
        newState[key] = value;
        this.setState(newState);
    },
    render: function render() {
        return ProjectUtils.isMultiPage() ? this.renderForMultiPage() : this.renderForSinglePage();
    },
    renderForMultiPage: function renderForMultiPage() {

        var showIfAnchor = { display: this.state.type === pageTypes.anchor ? 'block' : 'none' };
        var showIfInternal = { display: this.state.type === pageTypes.internal ? 'block' : 'none' };
        var showIfExternal = { display: this.state.type === pageTypes.external ? 'block' : 'none' };
        var showIfNotIndex = { display: this.state.index ? 'none' : 'block' };

        return React.createElement(
            'div',
            { className: 'visual-large-popup-navigation-settings' },
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap' },
                React.createElement(
                    'label',
                    null,
                    'Title:'
                ),
                React.createElement(TextField, { value: this.state.title, onChange: this.setFieldValue.bind(null, 'title') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap', style: showIfInternal },
                React.createElement(
                    'label',
                    null,
                    'Slug:'
                ),
                React.createElement(TextField, { value: this.state.slug, onChange: this.setFieldValue.bind(null, 'slug') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap visual-large-popup-navigation-field-wrap-textarea', style: showIfInternal },
                React.createElement(
                    'label',
                    null,
                    'Description (SEO):'
                ),
                React.createElement(TextArea, { value: this.state.description, onChange: this.setFieldValue.bind(null, 'description') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap', style: showIfExternal },
                React.createElement(
                    'label',
                    null,
                    'Url:'
                ),
                React.createElement(TextField, { value: this.state.urlExternal, onChange: this.setFieldValue.bind(null, 'urlExternal') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap', style: showIfAnchor },
                React.createElement(
                    'label',
                    null,
                    'Block to Anchor'
                ),
                React.createElement(Select, { value: this.state.urlAnchor, onChange: this.setFieldValue.bind(null, 'urlAnchor') })
            ),
            React.createElement(
                'div',
                {
                    className: 'visual-large-popup-navigation-field-wrap clearfix',
                    style: showIfNotIndex
                },
                React.createElement(
                    'label',
                    null,
                    'Link Type:'
                ),
                React.createElement(RadioButton, {
                    label: 'Internal',
                    checked: this.state.type === pageTypes.internal,
                    onChange: this.setFieldValue.bind(null, 'type', pageTypes.internal)
                }),
                React.createElement(RadioButton, {
                    label: 'External',
                    checked: this.state.type === pageTypes.external,
                    onChange: this.setFieldValue.bind(null, 'type', pageTypes.external)
                }),
                React.createElement(RadioButton, {
                    label: 'Anchor',
                    checked: this.state.type === pageTypes.anchor,
                    onChange: this.setFieldValue.bind(null, 'type', pageTypes.anchor)
                })
            ),
            React.createElement(
                'div',
                {
                    className: 'visual-large-popup-navigation-field-wrap visual-large-popup-navigation-field-wrap-set-as-home',
                    style: showIfInternal
                },
                React.createElement(CheckBox, {
                    label: 'Set As Home Page',
                    checked: this.state.index,
                    disabled: this.props.page ? this.props.page.index : false,
                    onChange: this.setFieldValue.bind(null, 'index')
                })
            ),
            this.renderButtons()
        );
    },
    renderForSinglePage: function renderForSinglePage() {

        var showIfAnchor = { display: this.state.type === pageTypes.anchor ? 'block' : 'none' };
        var showIfExternal = { display: this.state.type === pageTypes.external ? 'block' : 'none' };

        return React.createElement(
            'div',
            { className: 'visual-large-popup-navigation-settings' },
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap' },
                React.createElement(
                    'label',
                    null,
                    'Title:'
                ),
                React.createElement(TextField, { value: this.state.title, onChange: this.setFieldValue.bind(null, 'title') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap', style: showIfExternal },
                React.createElement(
                    'label',
                    null,
                    'Url:'
                ),
                React.createElement(TextField, { value: this.state.urlExternal, onChange: this.setFieldValue.bind(null, 'urlExternal') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap', style: showIfAnchor },
                React.createElement(
                    'label',
                    null,
                    'Block to Anchor'
                ),
                React.createElement(Select, { value: this.state.urlAnchor, onChange: this.setFieldValue.bind(null, 'urlAnchor') })
            ),
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-field-wrap clearfix' },
                React.createElement(
                    'label',
                    null,
                    'Link Type:'
                ),
                React.createElement(RadioButton, {
                    label: 'External',
                    checked: this.state.type === pageTypes.external,
                    onChange: this.setFieldValue.bind(null, 'type', pageTypes.external)
                }),
                React.createElement(RadioButton, {
                    label: 'Anchor',
                    checked: this.state.type === pageTypes.anchor,
                    onChange: this.setFieldValue.bind(null, 'type', pageTypes.anchor)
                })
            ),
            this.renderButtons()
        );
    },
    renderButtons: function renderButtons() {
        var className = 'visual-large-popup-navigation-buttons';
        var deleteButton = React.createElement(
            'button',
            { onClick: this['delete'] },
            'DELETE'
        );

        if (this.state.index) {
            className += ' visual-large-popup-navigation-buttons-large';
            deleteButton = null;
        }

        return React.createElement(
            'div',
            { className: className },
            React.createElement(
                'button',
                { onClick: this.close },
                'CANCEL'
            ),
            deleteButton,
            React.createElement(
                'button',
                { onClick: this.save },
                'SAVE'
            )
        );
    },
    save: function save() {
        var s = _.pick(this.state, 'title', 'type', 'slug', 'description', 'url', 'index');
        s.url = this.state.type === pageTypes.anchor ? this.state.urlAnchor : this.state.urlExternal;

        this.props.onSave(this.props.page.id, s);
        this.close();
    },
    'delete': function _delete() {
        this.props.onDelete(this.props.page.id);
        this.close();
    },
    close: function close() {
        this.props.close();
    }
});

module.exports = PageSettings;

},{"../../../../../../../../editor/js/global/Pages":98,"../../../../../../../../editor/js/helper/utils/ProjectUtils":128,"./CheckBox":25,"./RadioButton":26,"./Select":27,"./TextArea":28,"./TextField":29}],31:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    PageSettings = require('./PageSettings'),
    AddNewPage = require('./AddNewPage'),
    SizeMonitor = require('../../../../../../../editor/js/component/SizeMonitor'),
    ScrollPane = require('../../../../../../../editor/js/component/ScrollPane'),
    AutoScroll = require('../../../../../../../editor/js/component/dragdrop/AutoScroll'),
    Sortable = require('../../../../../../../editor/js/component/dragdrop/Sortable'),
    SortableTree = require('../../../../../../../editor/js/component/dragdrop/SortableTree'),
    TreeDepthLimitInsertionPointFinder = require('../../../../../../../editor/js/helper/dragdrop/insertionPoint/TreeDepthLimitInsertionPointFinder'),
    arrayInsertion = require('../../../../../../../editor/js/helper/dragdrop/arrayInsertion'),
    treeInsertion = require('../../../../../../../editor/js/helper/dragdrop/treeInsertion'),
    treeFind = require('../../../../../../../editor/js/helper/dragdrop/treeFind'),
    pageTypes = require('../../../../../../../editor/js/global/Pages').pageTypes,
    ProjectUtils = require('../../../../../../../editor/js/helper/utils/ProjectUtils');

function removeItemFromTree(tree, itemPath) {
    var treeItem = treeFind(tree, itemPath);
    var treeItemParent = treeFind(tree, itemPath.slice(0, -1));

    // remove the item from it's parent and append
    // the item's children to the parent
    treeItemParent.children.splice.apply(treeItemParent.children, [itemPath[itemPath.length - 1], 1].concat(treeItem.children));

    return tree;
}

function arrayInsertionToTreeInsertion(insertion) {
    return { pageId: insertion.id, children: [] };
}

var MenuBuilder = React.createClass({
    displayName: 'MenuBuilder',

    multiPageMode: null,
    pagesMap: null,
    getDefaultProps: function getDefaultProps() {
        return {
            pages: [],
            menus: [],
            onAddNewPage: function onAddNewPage() {},
            onUpdatePage: function onUpdatePage() {},
            onDeletePage: function onDeletePage() {},
            onMenusChanged: function onMenusChanged() {}
        };
    },
    getInitialState: function getInitialState() {
        return {
            menus: this.props.menus,
            autoScrollActive: false,
            settings: {
                show: false,
                page: null
            },
            dd: {
                source: null,
                target: null,
                insertion: null
            }
        };
    },
    componentWillMount: function componentWillMount() {
        this.multiPageMode = ProjectUtils.isMultiPage();
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        // (temp hack) used for menus render, to easily get the page data by an id
        // TODO: review when will have more time
        this.pagesMap = _.reduce(nextProps.pages, function (acc, page) {
            acc[page.id] = {
                title: page.title,
                type: page.type,
                index: page.index
            };
            return acc;
        }, {});

        // checking if all the pages in the menus are valid
        // they can be invalid when deleted from their settings
        var needToSaveMenus = false;
        var self = this;
        var menus = _.map(this.state.menus, function (menu) {
            var loopAgain;
            do {
                loopAgain = false;
                var invalidItemPath = findInvalidInChildren(menu, []);
                if (invalidItemPath) {
                    removeItemFromTree(menu, invalidItemPath);
                    loopAgain = true;
                    needToSaveMenus = true;
                }
            } while (loopAgain);

            return menu;

            function findInvalidInChildren(item, path) {
                return _.reduce(item.children, function (acc, child, index) {
                    if (acc) {
                        return acc;
                    }
                    if (!self.pagesMap[child.pageId]) {
                        return path.concat(index);
                    }
                    return findInvalidInChildren(child, path.concat(index));
                }, null);
            }
        });

        if (needToSaveMenus) {
            this.setState({ menus: menus }, this.saveMenus);
        }
    },

    render: function render() {
        var s = this.state,
            p = this.props,
            className = 'visual-large-popup-content';

        if (s.settings.show) {
            className += ' visual-large-popup-navigation-with-settings';
        }

        return React.createElement(
            'div',
            { className: 'visual-large-popup-scroll-wrap' },
            React.createElement(
                ScrollPane,
                { ref: 'scrollpane', style: { height: '100%' }, wrapScrollable: this.wrapScrollable },
                React.createElement(
                    SizeMonitor,
                    { onSizeChange: this.handleChangeSize },
                    React.createElement(
                        'div',
                        { className: className },
                        React.createElement(
                            'div',
                            { className: 'visual-large-popup-navigation-wrap' },
                            this.renderPages(),
                            this.renderMenus()
                        ),
                        React.createElement(PageSettings, {
                            page: s.settings.page,
                            close: this.closePageSettings,
                            onSave: p.onUpdatePage,
                            onDelete: p.onDeletePage
                        })
                    )
                )
            )
        );
    },
    wrapScrollable: function wrapScrollable(item) {
        return React.createElement(
            AutoScroll,
            { active: this.state.autoScrollActive, capture: true },
            item
        );
    },
    handleChangeSize: function handleChangeSize() {
        this.refs['scrollpane'].forceUpdate();
    },
    renderPages: function renderPages() {
        return React.createElement(
            'div',
            { className: 'visual-large-popup-navigation-pages' },
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-pages-inner' },
                React.createElement(
                    'h3',
                    null,
                    'AVAILABLE ',
                    this.multiPageMode ? 'PAGES' : 'ANCHORS'
                ),
                React.createElement(Sortable, {
                    ref: 'pages',
                    items: this.props.pages,
                    renderContainer: this.renderPagesContainer,
                    renderItem: this.renderPagesItem,
                    onForwardMouseDown: this.pagesMouseDown,
                    onChangeState: this.activateAutoScroll
                }),
                React.createElement(AddNewPage, { onSubmit: this.props.onAddNewPage })
            )
        );
    },
    renderPagesContainer: function renderPagesContainer(sortable, children) {
        return React.createElement(
            'ol',
            null,
            children,
            sortable.getSelection() ? sortable.renderFeedback(sortable.getInsertion()) : null
        );
    },
    renderPagesItem: function renderPagesItem(sortable, item) {
        var page = item.value,
            liClassName = '',
            iconClassName = '',
            handleMouseDown = null;

        if (!this.multiPageMode && page.type === pageTypes.internal) {
            return null;
        }

        switch (item.type) {
            case 'item':
                handleMouseDown = sortable.createMouseDownHandler(item);
                break;
            case 'selection':
                return null;
            case 'insertion':
                liClassName = 'placeholder';
                break;
            case 'feedback':
                liClassName = 'visual-nav-feedback';
                break;
        }

        if (page.type === pageTypes.internal) {
            iconClassName = page.index ? 'visual-icon-nav-page-home' : 'visual-icon-nav-page';
        } else if (page.type === pageTypes.anchor) {
            iconClassName = 'visual-icon-nav-page-external';
        } else {
            iconClassName = 'visual-icon-nav-page-external';
        }

        if (page.dirty) {
            return React.createElement(
                'li',
                { className: 'visual-dirty-item' },
                React.createElement(
                    'div',
                    { className: 'visual-large-popup-navigation-page-item' },
                    React.createElement(
                        'div',
                        { className: 'visual-large-popup-navigation-handler' },
                        React.createElement('i', { className: iconClassName }),
                        React.createElement(
                            'span',
                            null,
                            page.title
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'visual-spinner-loader' },
                        'Load'
                    )
                )
            );
        } else {
            return React.createElement(
                'li',
                { className: liClassName },
                React.createElement(
                    'div',
                    { className: 'visual-large-popup-navigation-page-item' },
                    React.createElement(
                        'div',
                        { className: 'visual-large-popup-navigation-handler', onMouseDown: handleMouseDown },
                        React.createElement('i', { className: iconClassName }),
                        React.createElement(
                            'span',
                            null,
                            page.title
                        )
                    ),
                    React.createElement('div', {
                        className: 'visual-icon-cog visual-large-popup-navigation-cog',
                        onClick: this.openPageSettings.bind(null, page.id)
                    })
                )
            );
        }
    },

    renderMenus: function renderMenus() {
        // (temp hack) used for menus render, to easily get the page data by an id
        // this is done for the FIRST TIME ONLY, the rest of the time it is done in
        // componentWillReceiveProps
        // TODO: review when will have more time
        if (!this.pagesMap) {
            this.pagesMap = _.reduce(this.props.pages, function (acc, page) {
                acc[page.id] = {
                    title: page.title,
                    type: page.type,
                    index: page.index
                };
                return acc;
            }, {});
        }

        var menus = _.map(this.state.menus, this.renderMenu);
        return React.createElement(
            'div',
            { className: 'visual-large-popup-navigation-menus' },
            React.createElement(
                'div',
                { className: 'visual-large-popup-navigation-menus-inner' },
                menus
            )
        );
    },
    renderMenu: function renderMenu(menu, index) {
        var className = '',
            id = menu.id,
            maxDepth = menu.multiLevel ? 3 : 1;
        return React.createElement(
            'div',
            { className: 'menu-container ' + className, key: index },
            React.createElement(
                'h3',
                null,
                menu.title
            ),
            React.createElement(SortableTree, {
                ref: id,
                root: menu,
                insertionPointFinder: TreeDepthLimitInsertionPointFinder.bind(null, maxDepth),
                renderContainer: this.renderMenusContainer,
                renderItem: this.renderMenusItem,
                onMouseEnter: this.handleMenusMouseEnter.bind(null, id),
                onForwardMouseDown: this.menusMouseDown.bind(null, id),
                onChange: this.handleMenusChange.bind(null, id),
                onChangeState: this.activateAutoScroll
            })
        );
    },
    renderMenusContainer: function renderMenusContainer(sortable, children, isRoot) {
        if (isRoot && !children.length) {
            return React.createElement(
                'ol',
                { className: 'visual-nav-empty-list' },
                React.createElement(
                    'li',
                    { className: 'visual-nav-empty-inner' },
                    'Drag & Drop ',
                    this.multiPageMode ? 'pages' : 'anchors',
                    ' here',
                    React.createElement('br', null),
                    'to create menu'
                ),
                sortable.getSelection() ? sortable.renderFeedback(this.state.dd.insertion) : null
            );
        } else {
            return React.createElement(
                'ol',
                { className: isRoot ? "visual-nav-root-list" : "" },
                children,
                isRoot && sortable.getSelection() ? sortable.renderFeedback(this.state.dd.insertion) : null
            );
        }
    },
    renderMenusItem: function renderMenusItem(sortable, item) {
        var menuId = sortable.props.root.id,
            // this is a little hacky way of getting the menu id
        itemPath = item.path,
            page = this.pagesMap[item.value.pageId],
            liClassName = '',
            // this is necessary for making fix, look for "Fix for :hover issue on Chrome" in Overlay.css
        itemClassName = '',
            iconClassName = '',
            handleMouseDown = null;

        // TODO: if this code is uncommented some wierd errors get thrown at drag & drop, figure it out later
        //if (
        //    (this.multiPageMode && page.type === pageTypes.anchor)
        //    || (!this.multiPageMode && page.type === pageTypes.internal)
        //) {
        //    return null;
        //}

        switch (item.type) {
            case 'item':
                handleMouseDown = sortable.createMouseDownHandler(item);
                break;
            case 'selection':
                break;
            case 'insertion':
                liClassName = 'visual-placeholder-fix';
                itemClassName = 'visual-nav-placeholder';
                break;
            case 'feedback':
                break;
        }

        if (!item.children.length) {
            if (page.type === pageTypes.internal) {
                iconClassName = page.index ? 'visual-icon-nav-page-home' : 'visual-icon-nav-page';
            } else if (page.type === pageTypes.anchor) {
                iconClassName = 'visual-icon-nav-page-external';
            } else {
                iconClassName = 'visual-icon-nav-page-external';
            }
        } else {
            iconClassName = 'visual-icon-nav-pages-group';
        }

        return React.createElement(
            'li',
            { className: liClassName },
            React.createElement(
                'div',
                { className: 'visual-navigation-page-item-wrap' },
                React.createElement(
                    'div',
                    {
                        className: 'visual-large-popup-navigation-page-item ' + itemClassName,
                        onMouseDown: handleMouseDown
                    },
                    React.createElement('i', { className: 'visual-large-popup-navigation-page-item-icon ' + iconClassName }),
                    React.createElement(
                        'span',
                        null,
                        page.title
                    )
                ),
                React.createElement('i', {
                    className: 'visual-large-popup-navigation-item-remove',
                    onClick: this.removeItemFromMenu.bind(null, menuId, itemPath)
                })
            ),
            sortable.renderSubtree(item)
        );
    },

    pagesMouseDown: function pagesMouseDown(sortable, elem, index, event) {
        var selection = [index],
            insertion = arrayInsertion(sortable.props.items, selection),
            insertionPoint = index,
            feedbackProps = {
            onPointer: this.handleFeedbackPointer,
            onMouseUp: this.handleMouseUp
        };
        sortable.start(selection, insertion, insertionPoint, elem, event, feedbackProps);
        this.setState({
            dd: {
                source: 'pages',
                target: 'pages',
                insertion: insertion
            }
        });
        event.preventDefault();
    },
    menusMouseDown: function menusMouseDown(target, sortable, elem, path, event) {
        var selection = path,
            insertion = treeInsertion(sortable.props.root, selection),
            insertionPoint = path,
            feedbackProps = {
            onPointer: this.handleFeedbackPointer,
            onMouseUp: this.handleMouseUp
        };
        sortable.start(selection, insertion, insertionPoint, elem, event, feedbackProps);
        this.setState({
            dd: {
                source: target,
                target: target,
                insertion: insertion
            }
        });
        event.preventDefault();
    },
    handleFeedbackPointer: function handleFeedbackPointer(x, y) {
        var dd = this.state.dd;
        if (dd.target !== 'pages') {
            this.refs[dd.target].updateInsertionPoint(x, y);
        }
    },
    handleMouseUp: function handleMouseUp() {
        var dd = this.state.dd;
        this.refs[dd.source].commit();
        this.refs[dd.target].commit();
        this.setState({
            dd: {
                source: null,
                target: null,
                insertion: null
            }
        });
    },
    handleMenusMouseEnter: function handleMenusMouseEnter(menuId) {
        var dd = this.state.dd;

        if (!dd.insertion) {
            return;
        }

        if (dd.source === 'pages') {
            if (dd.target !== 'pages') {
                this.refs[dd.target].setState({ insertion: null });
            }
            this.refs[menuId].setState({ insertion: arrayInsertionToTreeInsertion(dd.insertion[0]) });
        } else {
            this.refs[dd.target].setState({ insertion: null });
            this.refs[menuId].setState({ insertion: dd.insertion });
        }
        this.setState({
            dd: _.extend({}, dd, { target: menuId })
        });
    },
    handleMenusChange: function handleMenusChange(menuId, value) {
        var menus = this.state.menus,
            menu = _.find(menus, function (menu) {
            return menu.id === menuId;
        });

        menus[menus.indexOf(menu)] = value;
        this.setState({ menus: menus }, this.saveMenus);
    },
    removeItemFromMenu: function removeItemFromMenu(menuId, itemPath) {
        var menus = this.state.menus,
            menu = _.find(menus, function (menu) {
            return menu.id === menuId;
        });

        removeItemFromTree(menu, itemPath);

        this.setState({ menus: menus }, this.saveMenus);
    },
    saveMenus: function saveMenus() {
        this.props.onMenusChanged(JSON.parse(JSON.stringify(this.state.menus)));
    },

    openPageSettings: function openPageSettings(pageId) {
        var page = _.find(this.props.pages, function (page) {
            return page.id === pageId;
        });
        this.setState({
            settings: {
                show: true,
                page: page
            }
        });
    },
    closePageSettings: function closePageSettings() {
        this.setState({
            settings: {
                show: false,
                page: null
            }
        });
    },

    activateAutoScroll: function activateAutoScroll(active) {
        this.setState({ autoScrollActive: active });
    }

});

module.exports = MenuBuilder;

},{"../../../../../../../editor/js/component/ScrollPane":64,"../../../../../../../editor/js/component/SizeMonitor":66,"../../../../../../../editor/js/component/dragdrop/AutoScroll":87,"../../../../../../../editor/js/component/dragdrop/Sortable":89,"../../../../../../../editor/js/component/dragdrop/SortableTree":90,"../../../../../../../editor/js/global/Pages":98,"../../../../../../../editor/js/helper/dragdrop/arrayInsertion":104,"../../../../../../../editor/js/helper/dragdrop/insertionPoint/TreeDepthLimitInsertionPointFinder":113,"../../../../../../../editor/js/helper/dragdrop/treeFind":118,"../../../../../../../editor/js/helper/dragdrop/treeInsertion":119,"../../../../../../../editor/js/helper/utils/ProjectUtils":128,"./AddNewPage":24,"./PageSettings":30}],32:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Pages = require('../../../../../../editor/js/global/Pages'),
    Globals = require('../../../../../../editor/js/global/Globals'),
    ProjectUtils = require('../../../../../../editor/js/helper/utils/ProjectUtils'),
    MenuBuilder = require('./MenuBuilder'),
    getMenus = require('../../../../../../editor/js/helper/utils/MenuUtils').getMenus;

function getState() {
    return {
        pages: Pages.getPages(),
        menus: getMenus()
    };
}

var Navigation = React.createClass({
    displayName: 'Navigation',

    getInitialState: function getInitialState() {
        return getState();
    },

    componentDidMount: function componentDidMount() {
        Pages.addChangeListener(this.onPagesChange);
    },

    componentWillUnmount: function componentWillUnmount() {
        Pages.removeChangeListener(this.onPagesChange);
    },

    onPagesChange: function onPagesChange() {
        this.setState(getState());
    },

    onAddNewPage: function onAddNewPage(title) {
        Pages.addPage({
            title: title,
            type: ProjectUtils.isMultiPage() ? Pages.pageTypes.internal : Pages.pageTypes.anchor
        });
    },

    onUpdatePage: function onUpdatePage(pageId, data) {
        Pages.updatePage(pageId, data);

        // trigger a menu change for all the menu blocks
        // could redraw themselves with the potential new data
        // (new title, or new slug)
        Globals.emitChange('menus');
    },

    onDeletePage: function onDeletePage(pageId) {
        // TODO: make it like so when there will be time to refactor
        // 1. remove page from menus
        // 2. save page
        // 3. set state with new menus
        // 4. save globals

        Pages.deletePage(pageId);
    },

    onMenusChanged: _.debounce(function (changedMenus) {
        Globals.set('menus', changedMenus, 'language');
    }, 1000),

    render: function render() {
        return React.createElement(MenuBuilder, {
            pages: this.state.pages,
            menus: this.state.menus,
            onAddNewPage: this.onAddNewPage,
            onUpdatePage: this.onUpdatePage,
            onDeletePage: this.onDeletePage,
            onMenusChanged: this.onMenusChanged
        });
    }

});

module.exports = Navigation;

},{"../../../../../../editor/js/global/Globals":96,"../../../../../../editor/js/global/Pages":98,"../../../../../../editor/js/helper/utils/MenuUtils":126,"../../../../../../editor/js/helper/utils/ProjectUtils":128,"./MenuBuilder":31}],33:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    TreeView = require('../basic/TreeView');

var TABS = [{
	id: 'styles_editor',
	title: 'Styles Editor',
	icon: true
}, {
	id: 'integration',
	title: 'Integration',
	icon: true
}, {
	id: 'domains',
	title: 'Domains',
	icon: true,
	children: [{
		id: 'list',
		title: 'Domains List'
	}, {
		id: 'subdomain',
		title: 'Subdomain'
	}, {
		id: 'external',
		title: '3rd Party Domain'
	} /*,
   {
   id: 'buy',
   title: 'Buy Domain'
   }*/
	]
}];

var Handlers = React.createClass({
	displayName: 'Handlers',

	getDefaultProps: function getDefaultProps() {
		return {
			active: '',
			onChange: _.noop
		};
	},
	getIcon: function getIcon(name) {
		return React.createElement('i', { className: 'visual-icon-settings-' + name });
	},
	render: function render() {
		return React.createElement(
			'div',
			null,
			React.createElement(TreeView, { data: TABS, onChange: this.props.onChange, active: this.props.active, pre: this.getIcon })
		);
	}
});

module.exports = Handlers;

},{"../basic/TreeView":61}],34:[function(require,module,exports){
'use strict';

var _ = (window._),
    getDataApi = require('./Tabs/request_helper'),
    React = (window.React);

var PANELS = {
    styles_editor: require("./Tabs/StylesEditor"),
    integration: require("./Tabs/Integration"),
    buy: require("./Tabs/Domains/BuyDomain"),
    external: require("./Tabs/Domains/ThreeRdPartyDomain"),
    list: require("./Tabs/Domains/DomainsList"),
    subdomain: require("./Tabs/Domains/SubDomain")
};

var TabPanel = React.createClass({
    displayName: 'TabPanel',

    getInitialState: function getInitialState() {
        return {
            isLoading: false,
            response: {}
        };
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (nextProps.active != this.props.active) {
            this.setState({
                isLoading: false
            });
        }
    },

    sendRequest: function sendRequest(options) {
        this.setState({
            isLoading: true
        }, this.makeRequest(options));
    },

    makeRequest: function makeRequest(options) {
        var _this = this;

        var success = function success(data) {
            var response = _this.state.response;
            if (options.key) response[options.key] = data;
            if (_this.state.isLoading) {
                _this.setState({
                    isLoading: false,
                    response: response
                }, options.callbackSuccess ? options.callbackSuccess(data) : null);
            }
        };

        var error = function error(_error) {
            //console.error("description_error: ",error.responseText);
            if (_this.state.isLoading) {
                _this.setState({
                    isLoading: false
                }, options.callbackError ? options.callbackError(_error.responseText) : null);
            }
        };

        getDataApi({
            type: options.type || "GET",
            url: options.url,
            data: options.data || null,
            settingsKey: options.settingsKey,
            success: success,
            error: error
        });
    },

    getLoading: function getLoading() {
        if (this.state.isLoading) {
            return React.createElement(
                'div',
                { className: 'visual-popup-metrics-loading' },
                React.createElement(
                    'span',
                    null,
                    'Loading...'
                )
            );
        }
        return null;
    },

    render: function render() {
        var tab = PANELS[this.props.active];
        var props = _.chain(this.state).pick('data').extend(props, {
            sendRequest: this.sendRequest,
            data: this.state.response,
            onChange: this.props.onChange
        }).value();
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-tab-panel' },
            React.createElement(tab, props),
            this.getLoading()
        );
    }
});

module.exports = TabPanel;

},{"./Tabs/Domains/BuyDomain":38,"./Tabs/Domains/DomainsList":46,"./Tabs/Domains/SubDomain":47,"./Tabs/Domains/ThreeRdPartyDomain":50,"./Tabs/Integration":56,"./Tabs/StylesEditor":58,"./Tabs/request_helper":59}],35:[function(require,module,exports){
'use strict';

var Config = require('../../../../../../../editor/js/global/Config');

var settings = {
    getHost: function getHost() {
        return Config.get('baseUrl') + '/';
    },
    getProject: function getProject() {
        return Config.get('project');
    },
    getApiUrl: function getApiUrl() {
        return Config.get('apiUrl') + '/';
    },
    getProjectHash: function getProjectHash(keyApp) {
        return Config.get('projectsHash') ? Config.get('projectsHash')[keyApp] : '';
    }
};

module.exports = settings;

},{"../../../../../../../editor/js/global/Config":95}],36:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var prefixesList = ["com", "net", "org", "biz"];

var SearchDomain = React.createClass({
    displayName: 'SearchDomain',

    getInitialState: function getInitialState() {
        return {
            domainTitle: "",
            selectedPrefix: ""
        };
    },

    changeDomainTitle: function changeDomainTitle(event) {
        this.setState({ domainTitle: event.target.value });
    },

    changePrefix: function changePrefix(event) {
        this.setState({ selectedPrefix: event.target.value });
    },

    getListDomain: function getListDomain() {
        this.props.sendRequest({
            type: "GET",
            url: "domains/" + this.state.domainTitle + "/search.json",
            data: { tld: this.state.selectedPrefix },
            key: "listCartDomain"
        });
    },

    showListMenu: function showListMenu() {
        return this.props.data.listCartDomain ? React.createElement(ListDomain, { onChange: this.props.changeCart,
            cart: this.props.cart,
            data: this.props.data.listCartDomain }) : null;
    },

    showCart: function showCart() {
        return !_.isEmpty(this.props.cart) ? React.createElement(Cart, { activePage: this.props.activePage,
            removeInCart: this.props.removeInCart,
            cart: this.props.cart }) : null;
    },

    render: function render() {
        var options = _.map(prefixesList, function (index) {
            return React.createElement(
                'option',
                { value: index },
                index
            );
        });

        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'BUY DOMAIN'
                ),
                React.createElement(
                    'p',
                    null,
                    'Find your new domain name. It will be associated with your website.'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-left visual-popup-metrics-divider-vertical' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-form visual-popup-domain-rename-form' },
                        React.createElement(
                            'h4',
                            null,
                            'DOMAIN NAME:'
                        ),
                        React.createElement(
                            'form',
                            { onSubmit: this.getListDomain },
                            React.createElement(
                                'div',
                                { className: 'form-inline clearfix' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement('input', { onChange: this.changeDomainTitle,
                                        value: this.state.domainTitle,
                                        pattern: '^(?:[-A-Za-z0-9.])+$',
                                        placeholder: 'example-domain.com',
                                        type: 'text',
                                        className: 'form-control',
                                        required: true })
                                ),
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'select',
                                        { value: this.state.selectedPrefix,
                                            onChange: this.changePrefix,
                                            className: 'form-control' },
                                        React.createElement(
                                            'option',
                                            { value: '' },
                                            'All'
                                        ),
                                        options
                                    )
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'form-group input-group-btn' },
                                React.createElement(
                                    'button',
                                    { type: 'submit', className: 'visual-btn visual-btn-dark' },
                                    'CHECK AVAILIBILITY'
                                )
                            )
                        )
                    ),
                    this.showListMenu()
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-right' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-head' },
                    React.createElement(
                        'h3',
                        null,
                        'CART'
                    ),
                    React.createElement(
                        'p',
                        null,
                        'This is your shopping cart:'
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    this.showCart()
                )
            )
        );
    }
});

var ListDomain = React.createClass({
    displayName: 'ListDomain',

    render: function render() {
        var _this = this;
        return React.createElement(
            'div',
            { className: 'visual-popup-domain-search-list' },
            React.createElement(
                'h4',
                null,
                'Search results:'
            ),
            _.map(this.props.data, function (index) {
                return React.createElement(
                    'div',
                    { className: "visual-popup-domain-search-item clearfix " + index.status },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-domain-search-name' },
                        index.domain
                    ),
                    React.createElement(
                        'div',
                        { className: 'visual-popup-domain-search-status' },
                        index.status == 'available' ? React.createElement(
                            'div',
                            { className: 'visual-popup-domain-search-manage',
                                onClick: _this.props.onChange.bind(null, index) },
                            _.findWhere(_this.props.cart, index) ? React.createElement(
                                'span',
                                { className: 'visual-btn visual-btn-dark visual-btn-sm visual-btn-full' },
                                'REMOVE'
                            ) : React.createElement(
                                'span',
                                { className: 'visual-btn visual-btn-green visual-btn-sm visual-btn-full' },
                                'ADD'
                            )
                        ) : index.status
                    )
                );
            })
        );
    }
});

var Cart = React.createClass({
    displayName: 'Cart',

    render: function render() {
        var _this = this;
        return React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                null,
                _.map(this.props.cart, function (index) {
                    return React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'div',
                            null,
                            index.domain
                        ),
                        React.createElement(
                            'div',
                            { onClick: _this.props.removeInCart.bind(null, index) },
                            'X'
                        )
                    );
                })
            ),
            React.createElement(
                'div',
                { className: 'save-domain' },
                !_.isEmpty(this.props.cart) ? React.createElement(
                    'button',
                    { onClick: this.props.activePage.bind(null, 'userInf'), className: 'visual-btn visual-btn-teal' },
                    'Save'
                ) : null
            )
        );
    }

});

module.exports = SearchDomain;

},{}],37:[function(require,module,exports){
'use strict';

var React = (window.React),
    UserData = require('./../../basic/userInf'),
    _ = (window._);

var UserInf = React.createClass({
    displayName: 'UserInf',

    getInitialState: function getInitialState() {
        return {
            response: [],
            first_name: "User Name",
            last_name: "Last Name",
            org_name: "Org Name",
            email: "testUser@sadsd.ru",
            phone: "123456789",
            address1: "Adress1",
            address2: "Adress2",
            address3: "Adress3",
            city: "City",
            state: "State",
            country: "MD",
            postal_code: "2312",
            fax: ""
        };
    },

    handleChange: function handleChange(name, e) {
        var change = {};
        change[name] = e.target.value;
        this.setState(change);
    },

    statusDomains: function statusDomains() {
        return _.map(this.state.response, function (item) {
            return React.createElement(
                'div',
                { className: "domain-response " + (item.code == 200 ? "success" : "error") },
                item.domain
            );
        });
    },

    saveUserInf: function saveUserInf() {
        var _this = this,
            key,
            data = {},
            i = 0;
        data = _.pick(this.state, "first_name", "last_name", "org_name", "email", "phone", "address1", "address2", "address3", "city", "state", "country", "postal_code", "fax");
        _.each(this.props.cart, function (index) {
            key = "domain[" + i + "]";
            data[key] = index.domain;
            i++;
        });

        this.props.sendRequest({
            type: "POST",
            url: "projects/{%projectId%}/domains/purchases.json",
            data: data,
            key: "userInf",
            callbackSuccess: function callbackSuccess(data) {
                _this.setState({ response: data });
            }
        });
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(
                'button',
                { onClick: this.props.activePage.bind(null, "listCartDomain"),
                    className: 'btn btn-primary' },
                '<-- Back'
            ),
            React.createElement(UserData, { onSave: this.saveUserInf,
                handleChange: this.handleChange,
                data: this.state }),
            this.statusDomains()
        );
    }

});

module.exports = UserInf;

},{"./../../basic/userInf":53}],38:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var tabs = {
    listCartDomain: require("./Tabs/ListDomain"),
    userInf: require("./Tabs/UserInf")
};

var Add = React.createClass({
    displayName: 'Add',

    getInitialState: function getInitialState() {
        return {
            active_tab: "listCartDomain",
            cart: []
        };
    },

    changeCart: function changeCart(item) {
        var cart = this.state.cart;
        if (_.findWhere(this.state.cart, item)) {
            cart = _.reject(this.state.cart, function (num) {
                return num.domain == item.domain;
            });
        } else {
            cart.push(item);
        }
        this.setState({ cart: cart });
    },

    removeInCart: function removeInCart(item) {
        var cart = _.without(this.state.cart, item);
        this.setState({ cart: cart });
    },

    activePage: function activePage(active) {
        this.setState({ active_tab: active });
    },

    render: function render() {
        var tab = tabs[this.state.active_tab];
        var props = _.pick(this.props, 'sendRequest', 'data');
        _.extend(props, {
            activePage: this.activePage,
            cart: this.state.cart,
            changeCart: this.changeCart,
            removeInCart: this.removeInCart
        });
        return React.createElement(
            'div',
            null,
            React.createElement(tab, props)
        );
    }

});

module.exports = Add;

},{"./Tabs/ListDomain":36,"./Tabs/UserInf":37}],39:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var AuthKey = React.createClass({
    displayName: 'AuthKey',

    getInitialState: function getInitialState() {
        return {};
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(
                'button',
                { onClick: this.props.activePage.bind(null, this.props.list[this.props.InfDomain]['type']), className: 'btn btn-primary' },
                '<-- Back'
            ),
            React.createElement(
                'div',
                null,
                this.props.data.authKey ? this.props.data.authKey['domain_auth_info'] : ""
            )
        );
    }

});

module.exports = AuthKey;

},{}],40:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    DNS = require('./../../basic/getDNS'),
    _ = (window._);

var DnsSetting = React.createClass({
    displayName: 'DnsSetting',

    getInitialState: function getInitialState() {
        return {};
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(DNS, { activeDomain: this.props.activeDomain,
                handleTabChange: this.props.activePage,
                sendRequest: this.props.sendRequest })
        );
    }

});

module.exports = DnsSetting;

},{"./../../basic/getDNS":52}],41:[function(require,module,exports){
'use strict';

var React = (window.React),
    DNS = require('./../../basic/getDNS'),
    _ = (window._);

var external = React.createClass({
    displayName: 'external',

    getInitialState: function getInitialState() {

        return {
            InfDomain: this.props.list[this.props.InfDomain]
        };
    },

    makePrimary: function makePrimary() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + InfOneDomain['id'] + ".json",
            data: { is_primary: 1 },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    var is_primary = _.findWhere(_this.props.list, { is_primary: true });
                    var index = _.lastIndexOf(_this.props.list, is_primary);
                    list[index]['is_primary'] = false;
                    list[_this.props.InfDomain]['is_primary'] = !InfOneDomain.is_primary;
                    _this.props.changeList(list);
                }
            }
        });
    },

    connectDisconectDomain: function connectDisconectDomain() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        var method = InfOneDomain['is_active'] ? "DELETE" : "PUT";
        var url = InfOneDomain['is_active'] ? "projects/{%projectId%}/domains/" + InfOneDomain['id'] + ".json" : "projects/{%projectId%}/domains/" + InfOneDomain['id'] + "/connect.json";
        this.props.sendRequest({
            type: method,
            url: url,
            data: {},
            callbackSuccess: function callbackSuccess(data) {
                var is_active = _.findWhere(_this.props.list, { id: InfOneDomain['id'] });
                var index = _.lastIndexOf(_this.props.list, is_active);
                if (InfOneDomain['is_active']) {
                    list.splice(index, 1);
                    _this.props.activePage("list");
                    _this.props.changeList(list);
                } else {
                    console.log("data", data);
                }
            }
        });
    },

    useWWWprefix: function useWWWprefix(event) {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        var www_prefix = InfOneDomain['www_prefix'] ? 0 : 1;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + ".json",
            data: { www_prefix: www_prefix },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    list[_this.props.InfDomain]['www_prefix'] = !InfOneDomain['www_prefix'];
                    _this.props.changeList(list);
                }
            }
        });
    },

    showDns: function showDns(data) {
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + "/connect.json",
            data: {},
            key: "dns"
        });
        this.props.activePage("dnsSetting");
    },

    render: function render() {
        var data = this.state.InfDomain;
        return React.createElement(
            'div',
            { className: 'visual-large-popup-content-domain-settingsOneDomain' },
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.props.activePage.bind(null, "list"), className: 'btn btn-primary' },
                    '<-- Back'
                )
            ),
            data['is_primary'] || !data['is_active'] ? "" : React.createElement(
                'button',
                { onClick: this.makePrimary,
                    className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                'Make Primary'
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.showDns,
                        className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    'DNS Settings'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    {
                        className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    'Add Email'
                )
            ),
            React.createElement(
                'div',
                null,
                data['is_primary'] ? "" : React.createElement(
                    'button',
                    { onClick: this.connectDisconectDomain, className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    data['is_active'] ? "Disconnect Domain" : "Connect Domain"
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { checked: data['www_prefix'] ? "checked" : "", onChange: this.useWWWprefix, type: 'checkbox' }),
                React.createElement(
                    'span',
                    null,
                    'Use www prefix'
                )
            )
        );
    }

});

module.exports = external;

},{"./../../basic/getDNS":52}],42:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var interior = React.createClass({
    displayName: 'interior',

    getInitialState: function getInitialState() {

        return {
            InfDomain: this.props.list[this.props.InfDomain],
            activeTypeUser: "owner"
        };
    },

    makePrimary: function makePrimary() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + InfOneDomain['id'] + ".json",
            data: { is_primary: 1 },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    var is_primary = _.findWhere(_this.props.list, { is_primary: true });
                    var index = _.lastIndexOf(_this.props.list, is_primary);
                    list[index]['is_primary'] = false;
                    list[_this.props.InfDomain]['is_primary'] = !InfOneDomain.is_primary;
                    _this.props.changeList(list);
                }
            }
        });
    },

    getAuthKey: function getAuthKey() {
        this.props.sendRequest({
            type: "GET",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + "/authcode.json",
            data: {},
            key: "authKey"
        });
        this.props.activePage("authKey");
    },

    editUser: function editUser() {
        var _this = this;
        this.props.sendRequest({
            type: "GET",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + "/contacts/" + this.state.activeTypeUser + ".json",
            data: {},
            callbackSuccess: function callbackSuccess(data) {
                _this.props.changeUserInf(data);
            }
        });
        //this.props.activePage("userInf");
    },

    useWWWprefix: function useWWWprefix() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        var www_prefix = InfOneDomain['www_prefix'] ? 0 : 1;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + ".json",
            data: { www_prefix: www_prefix },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    list[_this.props.InfDomain]['www_prefix'] = !InfOneDomain['www_prefix'];
                    _this.props.changeList(list);
                }
            }
        });
    },

    changeWhois: function changeWhois() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        var whois = InfOneDomain['whois'] ? 0 : 1;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + ".json",
            data: { whois: whois },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    list[_this.props.InfDomain]['whois'] = !InfOneDomain['whois'];
                    _this.props.changeList(list);
                }
            }
        });
    },

    changeLock: function changeLock() {
        var _this = this,
            InfOneDomain = this.state.InfDomain,
            list = this.props.list;
        var lock_state = InfOneDomain['lock_state'] ? 0 : 1;
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.state.InfDomain['id'] + ".json",
            data: { lock_state: lock_state },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    list[_this.props.InfDomain]['lock_state'] = !InfOneDomain['lock_state'];
                    _this.props.changeList(list);
                }
            }
        });
    },

    render: function render() {

        var data = this.state.InfDomain;

        return React.createElement(
            'div',
            { className: 'visual-large-popup-content-domain-settingsOneDomain' },
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.props.activePage.bind(null, "list"), className: 'btn btn-primary' },
                    '<-- Back'
                )
            ),
            data['is_primary'] || !data['is_active'] ? "" : React.createElement(
                'button',
                { onClick: this.makePrimary,
                    className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                'Make Primary'
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.editUser,
                        className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    'Edit Users'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    {
                        className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    'Add Email'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.getAuthKey,
                        className: 'visual-large-popup-content-domain-settingsOneDomain-button btn btn-default' },
                    'GET transfer key'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { checked: data['www_prefix'] ? "checked" : "", onChange: this.useWWWprefix, type: 'checkbox' }),
                React.createElement(
                    'span',
                    null,
                    'Use www prefix'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { checked: data['whois'] ? "checked" : "", onChange: this.changeWhois, type: 'checkbox' }),
                React.createElement(
                    'span',
                    null,
                    'Whois Pivacy'
                )
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { checked: data['lock_state'] ? "checked" : "", onChange: this.changeLock, type: 'checkbox' }),
                React.createElement(
                    'span',
                    null,
                    'Lock domain'
                )
            )
        );
    }

});

module.exports = interior;

},{}],43:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Config = require('../../../../../../../../../../editor/js/global/Config'),
    AddDomain = require('./../../basic/addDomain');

var List = React.createClass({
    displayName: 'List',

    disconnectDomain: function disconnectDomain(domain) {
        var list = this.props.list;
        var _this = this;
        this.props.sendRequest({
            type: "DELETE",
            url: "projects/{%projectId%}/domains/" + domain['id'] + ".json",
            data: {},
            callbackSuccess: function callbackSuccess() {
                var newList = _.without(list, domain);
                _this.props.changeList(newList);
            }
        });
    },

    makePrimary: function makePrimary(domain, event) {
        var _this = this,
            list = this.props.list,
            key = _.indexOf(this.props.list, domain);
        event.stopPropagation();
        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + domain['id'] + ".json",
            data: { is_primary: 1 },
            callbackSuccess: function callbackSuccess(data) {
                if (data.code == 200) {
                    var index, is_primary;
                    is_primary = _.findWhere(_this.props.list, { is_primary: true });
                    if (is_primary) {
                        index = _.lastIndexOf(_this.props.list, is_primary);
                        list[index]['is_primary'] = false;
                    }
                    list[key]['is_primary'] = !domain.is_primary;
                    _this.props.changeList(list);
                }
            }
        });
    },

    showDns: function showDns(activeDomain) {
        this.props.activePage("dnsSetting", activeDomain);
    },

    getStatus: function getStatus(status) {

        if (status.is_primary) {
            return React.createElement(
                'div',
                { className: 'visual-ribbon visual-ribbon-green' },
                'Primary Domain'
            );
        } else if (status.is_active) {
            return React.createElement(
                'div',
                { className: 'visual-btn visual-btn-dark visual-btn-sm', onClick: this.makePrimary.bind(this, status) },
                'MAKE PRIMARY'
            );
        } else {
            return React.createElement(
                'div',
                { className: 'visual-ribbon visual-ribbon-red' },
                'NOT VERIFIED'
            );
        }
    },

    getList: function getList() {
        var _this = this;
        var list = _.sortBy(this.props.list, function (index) {
            return index.type;
        });
        list = list.reverse();

        return _.map(list, function (index) {
            return React.createElement(
                'div',
                null,
                React.createElement(
                    'div',
                    { className: 'visual-popup-domain-box clearfix' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-domain-box-description' },
                        React.createElement(
                            'div',
                            { className: 'visual-popup-domain-box-name' },
                            index.name + (index.type == 'subdomain' ? "." + Config.get('originHost') : "")
                        ),
                        React.createElement(
                            'div',
                            { className: 'visual-popup-domain-box-meta' },
                            React.createElement(
                                'span',
                                { className: 'domain-type' },
                                index.type
                            ),
                            _this.showSettings(index),
                            _this.showDisconnectButton(index)
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'visual-popup-domain-box-status' },
                        _this.getStatus(index)
                    )
                ),
                index.type == 'subdomain' ? React.createElement('div', { className: 'visual-popup-metrics-divider-line' }) : null
            );
        });
    },

    showDisconnectButton: function showDisconnectButton(domain) {
        return domain.type != 'subdomain' ? React.createElement(
            'div',
            { className: 'domain-disconnect' },
            React.createElement(
                'span',
                { className: 'separator' },
                '|'
            ),
            React.createElement(
                'a',
                { href: '#', onClick: this.disconnectDomain.bind(null, domain) },
                'Disconnect'
            )
        ) : null;
    },

    showSettings: function showSettings(domain) {
        return domain.type != 'subdomain' ? React.createElement(
            'span',
            null,
            React.createElement(
                'span',
                { className: 'separator' },
                '|'
            ),
            React.createElement('span', { className: 'domain-prefix' }),
            React.createElement(
                'a',
                { href: '#', onClick: this.showDns.bind(null, domain) },
                'DNS Settings'
            )
        ) : null;
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-left visual-popup-metrics-divider-vertical' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-head' },
                    React.createElement(
                        'h3',
                        null,
                        'DOMAINS LIST'
                    ),
                    React.createElement(
                        'p',
                        null,
                        'List of all domains associated with this project:'
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    this.getList()
                )
            ),
            React.createElement(AddDomain, { handleTabChange: this.props.handleTabChange })
        );
    }

});

module.exports = List;

},{"../../../../../../../../../../editor/js/global/Config":95,"./../../basic/addDomain":51}],44:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Config = require('../../../../../../../../../../editor/js/global/Config');

var Subdomain = React.createClass({
    displayName: 'Subdomain',

    getInitialState: function getInitialState() {
        return {
            title: this.props.list[this.props.InfDomain]['name']
        };
    },

    renameSubDomain: function renameSubDomain() {
        this.props.sendRequest({
            type: "POST",
            url: "projects/{%projectId%}/domains.json",
            data: { type: 'subdomain', name: this.state.title },
            key: "subdomain"
        });
    },

    handleChange: function handleChange(event) {
        this.setState({ title: event.target.value });
    },

    render: function render() {
        console.log("this.props", this.props);
        return React.createElement(
            'div',
            { className: 'visual-large-popup-content-domain-settingsOneDomain' },
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.props.activePage.bind(null, "list"), className: 'btn btn-primary' },
                    '<-- Back'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-form visual-popup-domain-rename-form' },
                React.createElement(
                    'h4',
                    null,
                    'RENAME SUBDOMAIN NAME:'
                ),
                React.createElement(
                    'form',
                    { action: '' },
                    React.createElement(
                        'div',
                        { className: 'form-inline clearfix' },
                        React.createElement(
                            'div',
                            { className: 'form-group' },
                            React.createElement('input', { pattern: '/^[-a-z0-9]{3,20}$/',
                                onChange: this.handleChange,
                                value: this.state.title,
                                type: 'text',
                                className: 'form-control' })
                        ),
                        React.createElement(
                            'div',
                            { className: 'form-group input-group-addon' },
                            React.createElement(
                                'div',
                                null,
                                '.',
                                Config.get('originHost')
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'form-group input-group-btn' },
                            React.createElement(
                                'button',
                                { type: 'button', onClick: this.renameSubDomain, className: 'visual-btn visual-btn-dark' },
                                'Change'
                            )
                        )
                    )
                )
            )
        );
    }

});

module.exports = Subdomain;

},{"../../../../../../../../../../editor/js/global/Config":95}],45:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    UserData = require('./../../basic/userInf'),
    _ = (window._);

var UserInf = React.createClass({
    displayName: 'UserInf',

    getInitialState: function getInitialState() {
        return this.props.userInf;
    },

    handleChange: function handleChange(name, e) {
        var change = {};
        change[name] = e.target.value;
        this.setState(change);
    },

    statusDomains: function statusDomains() {
        var data = this.state.response;
        if (data) {
            return React.createElement(
                'div',
                { className: "domain-response " + (data.code == 200 ? "success" : "error") },
                data.domain
            );
        } else {
            return null;
        }
    },

    saveUserInf: function saveUserInf() {
        var key,
            data = {},
            i = 0,
            _this = this;
        data = _.pick(this.state, "first_name", "last_name", "org_name", "email", "phone", "address1", "address2", "address3", "city", "state", "country", "postal_code", "fax");
        _.each(this.props.cart, function (index) {
            key = "domain[" + i + "]";
            data[key] = index.domain;
            i++;
        });

        this.props.sendRequest({
            type: "PUT",
            url: "projects/{%projectId%}/domains/" + this.props.list[this.props.InfDomain]['id'] + "/contacts/owner.json",
            data: data,
            callbackSuccess: function callbackSuccess(data) {
                _this.setState({ response: data });
            }
        });
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(
                'button',
                { onClick: this.props.activePage.bind(null, this.props.list[this.props.InfDomain]['type']), className: 'btn btn-primary' },
                '<-- Back'
            ),
            React.createElement(UserData, { onSave: this.saveUserInf, handleChange: this.handleChange, data: this.state }),
            this.statusDomains()
        );
    }

});

module.exports = UserInf;

},{"./../../basic/userInf":53}],46:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var tabs = {
    list: require("./Tabs/List"),
    dnsSetting: require("./Tabs/DnsSetting"),
    authKey: require("./Tabs/AuthKey"),
    userInf: require("./Tabs/UserInf"),
    external: require("./Tabs/External"),
    interior: require("./Tabs/Interior"),
    subdomain: require("./Tabs/Subdomain")
};

var Built = React.createClass({
    displayName: 'Built',

    getInitialState: function getInitialState() {
        this.getList();
        return {
            active_tab: "list",
            activeDomain: {},
            list: [],
            InfDomain: {},
            userInf: {}
        };
    },

    changeList: function changeList(list) {
        this.setState({ list: list });
    },

    getList: function getList() {
        var _this = this;
        this.props.sendRequest({
            type: "GET",
            url: "projects/{%projectId%}/domains.json?orderBy=key",
            data: {},
            key: "listDomain",
            callbackSuccess: function callbackSuccess(data) {
                _this.setState({ list: data });
            }
        });
    },

    activePage: function activePage(active, activeDomain) {
        this.setState({ active_tab: active, activeDomain: activeDomain });
    },

    //changeUserInf: function (data) {
    //    this.setState({userInf: data,active_tab: "userInf"});
    //},
    //
    //showOneDomain: function (id, type) {
    //    var data = _.findWhere(this.state.list, {id: id});
    //    var index =_.lastIndexOf(this.state.list, data);
    //    this.setState({active_tab: type, InfDomain: index});
    //},

    render: function render() {
        var tab = tabs[this.state.active_tab];
        var props = _.pick(this.props, 'sendRequest', 'data');
        _.extend(props, {
            activePage: this.activePage,
            changeList: this.changeList,
            handleTabChange: this.props.onChange,
            list: this.state.list,
            activeDomain: this.state.activeDomain
            //active_tab: this.state.active_tab,
            //showOneDomain: this.showOneDomain,
            //changeUserInf: this.changeUserInf,
            //InfDomain: this.state.InfDomain,
            //userInf: this.state.userInf,
        });
        return React.createElement(
            'div',
            null,
            React.createElement(tab, props)
        );
    }

});

module.exports = Built;

},{"./Tabs/AuthKey":39,"./Tabs/DnsSetting":40,"./Tabs/External":41,"./Tabs/Interior":42,"./Tabs/List":43,"./Tabs/Subdomain":44,"./Tabs/UserInf":45}],47:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Config = require('../../../../../../../../../editor/js/global/Config'),
    AddDomain = require('./../basic/addDomain');

var SubDomain = React.createClass({
    displayName: 'SubDomain',

    getInitialState: function getInitialState() {
        this.getSubDomain();
        return {
            title: '',
            status: {}
        };
    },

    getSubDomain: function getSubDomain() {
        var _this = this,
            lastElement;
        this.props.sendRequest({
            type: "GET",
            url: "projects/{%projectId%}/domains.json?type=subdomain",
            data: {},
            callbackSuccess: function callbackSuccess(data) {
                _this.setState({ title: data[0].name });
            }
        });
    },

    renameSubDomain: function renameSubDomain() {
        var _this = this;
        event.preventDefault();
        this.props.sendRequest({
            type: "POST",
            url: "projects/{%projectId%}/domains.json",
            data: {
                type: 'subdomain',
                name: this.state.title
            },
            callbackSuccess: function callbackSuccess(data) {
                _this.setState({
                    status: {
                        code: 200,
                        data: data
                    }
                });
            },
            callbackError: function callbackError(data) {
                _this.setState({ status: {
                        code: 400,
                        data: data
                    } });
            }
        });
        this.setState({ status: {} });
    },

    handleChange: function handleChange(event) {
        this.setState({ title: event.target.value });
    },

    getStatus: function getStatus() {
        if (_.isEmpty(this.state.status)) return false;
        var status = this.state.status;

        if (status.code == 200) {
            return React.createElement(
                'div',
                { className: 'visual-alert visual-alert-success' },
                React.createElement(
                    'strong',
                    null,
                    'Success:'
                ),
                ' Your subdomain was changed successfully.'
            );
        }
        if (status.code == 400) {
            return React.createElement(
                'div',
                { className: 'visual-alert visual-alert-error' },
                React.createElement(
                    'strong',
                    null,
                    'Error:'
                ),
                ' ',
                JSON.parse(status.data).message || JSON.parse(status.data).error_description
            );
        }
        return null;
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'SUBDOMAIN'
                ),
                React.createElement(
                    'p',
                    null,
                    'This is your free subdomain for your BitBlox project.'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-left visual-popup-metrics-divider-vertical' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'form',
                        { onSubmit: this.renameSubDomain },
                        React.createElement(
                            'div',
                            { className: 'visual-popup-form visual-popup-domain-rename-form' },
                            this.getStatus(),
                            React.createElement(
                                'h4',
                                null,
                                'YOUR SUBDOMAIN NAME'
                            ),
                            React.createElement(
                                'div',
                                { className: 'form-inline clearfix' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement('input', { onChange: this.handleChange,
                                        value: this.state.title,
                                        type: 'text', className: 'form-control' })
                                ),
                                React.createElement(
                                    'div',
                                    { className: 'form-group input-group-addon' },
                                    React.createElement(
                                        'div',
                                        null,
                                        '.',
                                        Config.get('originHost')
                                    )
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'form-group input-group-btn' },
                                React.createElement(
                                    'button',
                                    { className: 'visual-btn visual-btn-dark' },
                                    'Save Changes'
                                )
                            )
                        )
                    )
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-right' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-metrics-body-text' },
                        React.createElement(
                            'div',
                            { className: 'popup-icon-info' },
                            'i'
                        ),
                        React.createElement(
                            'p',
                            null,
                            'Choose the name of your free subdomain hosted with BitBlox platform. This will be the address where visitors can view your website. You can change this to your own subdomain here.'
                        )
                    )
                )
            )
        );
    }

});

module.exports = SubDomain;

},{"../../../../../../../../../editor/js/global/Config":95,"./../basic/addDomain":51}],48:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var AddDomain = React.createClass({
    displayName: 'AddDomain',

    getInitialState: function getInitialState() {
        return {
            title: "",
            error: null
        };
    },

    saveDomain: function saveDomain(event) {
        event.preventDefault();
        var _this = this;
        this.props.sendRequest({
            type: "POST",
            url: "projects/{%projectId%}/domains.json",
            data: {
                type: "external",
                name: this.state.title
            },
            callbackSuccess: function callbackSuccess(data) {
                // hack.
                setTimeout(function () {
                    _this.props.activePage("dnsSetting", data);
                }, 100);
            },
            callbackError: function callbackError(error) {
                _this.setState({ error: error });
            }
        });
        this.setState({ error: null });
    },

    changeHandler: function changeHandler(event) {
        this.setState({ title: event.target.value });
    },

    getError: function getError() {
        if (this.state.error) {
            return React.createElement(
                'div',
                { className: 'visual-alert visual-alert-error' },
                React.createElement(
                    'strong',
                    null,
                    'Error:'
                ),
                ' ',
                JSON.parse(this.state.error).message
            );
        }
        return null;
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'USE 3RD PARTY DOMAIN'
                ),
                React.createElement(
                    'p',
                    null,
                    'Connect your own domain, that you’ve already purchased from a 3rd party provider.'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-left visual-popup-metrics-divider-vertical' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-form visual-popup-add-domain-form' },
                        this.getError(),
                        React.createElement(
                            'form',
                            { onSubmit: this.saveDomain },
                            React.createElement(
                                'div',
                                { className: 'form-group' },
                                React.createElement(
                                    'label',
                                    { htmlFor: 'domain-name' },
                                    'Domain Name'
                                ),
                                React.createElement('input', { onChange: this.changeHandler,
                                    value: this.state.title,
                                    pattern: '^(?:[-A-Za-z0-9]+\\.)+[A-Za-z]{2,10}$',
                                    className: 'form-control',
                                    id: 'domain-name',
                                    type: 'text',
                                    placeholder: 'my-example.com',
                                    required: true })
                            ),
                            React.createElement(
                                'div',
                                { className: 'form-submit' },
                                React.createElement(
                                    'button',
                                    { className: 'visual-btn visual-btn-dark' },
                                    'CONNECT DOMAIN'
                                )
                            )
                        )
                    )
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-right' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-metrics-body-text' },
                        React.createElement(
                            'div',
                            { className: 'popup-icon-info' },
                            'i'
                        ),
                        React.createElement(
                            'p',
                            null,
                            'Here you can connect your already purchased domain, which will overwrite the free subdomain you are currently using. Follow the steps to make the switch in no time.'
                        )
                    )
                )
            )
        );
    }

});

module.exports = AddDomain;

},{}],49:[function(require,module,exports){
'use strict';

var React = (window.React),
    DNS = require('./../../basic/getDNS'),
    _ = (window._);

var DnsSetting = React.createClass({
    displayName: 'DnsSetting',

    getInitialState: function getInitialState() {
        return {};
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(DNS, { activeDomain: this.props.activeDomain,
                handleTabChange: this.props.handleTabChange,
                sendRequest: this.props.sendRequest })
        );
    }

});

module.exports = DnsSetting;

},{"./../../basic/getDNS":52}],50:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var tabs = {
    addDomain: require("./Tabs/AddDomain"),
    dnsSetting: require("./Tabs/DnsSetting")
};

var ThirdParty = React.createClass({
    displayName: 'ThirdParty',

    getInitialState: function getInitialState() {
        return {
            active_tab: "addDomain",
            activeDomain: {},
            cart: []
        };
    },

    activePage: function activePage(active, activeDomain) {
        this.setState({ active_tab: active, activeDomain: activeDomain });
    },

    render: function render() {
        var tab = tabs[this.state.active_tab];
        var props = _.pick(this.props, 'sendRequest', 'data');
        _.extend(props, {
            activePage: this.activePage,
            handleTabChange: this.props.onChange,
            activeDomain: this.state.activeDomain
        });
        return React.createElement(
            'div',
            null,
            React.createElement(tab, props)
        );
    }

});

module.exports = ThirdParty;

},{"./Tabs/AddDomain":48,"./Tabs/DnsSetting":49}],51:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var addDomain = React.createClass({
    displayName: 'addDomain',

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols-right' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'ADD DOMAIN'
                ),
                React.createElement(
                    'p',
                    null,
                    'Connect a new domain:'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-body' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body-text' },
                    'This is the domains list for your BitBlox website. here you can add, remove and set primary domains.'
                ),
                React.createElement(
                    'button',
                    { onClick: this.props.handleTabChange.bind(null, 'external'),
                        type: 'button',
                        className: 'visual-btn visual-btn-teal visual-btn-full' },
                    'Connect 3rd Party Domain'
                )
            )
        );
    }
});

module.exports = addDomain;

},{}],52:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var DNS = React.createClass({
	displayName: 'DNS',

	getInitialState: function getInitialState() {
		return { dns: {} };
	},

	componentDidMount: function componentDidMount() {
		this.getDNS();
	},

	getDNS: function getDNS() {
		var _this = this;
		this.props.sendRequest({
			type: "PUT",
			url: "projects/{%projectId%}/domains/" + this.props.activeDomain['id'] + "/connect.json",
			data: {},
			callbackSuccess: function callbackSuccess(data) {
				_this.setState({ dns: data });
			}
		});
	},

	render: function render() {
		return React.createElement(
			'div',
			{ className: 'visual-popup-metrics-cols' },
			React.createElement(
				'div',
				{ className: 'visual-popup-back-btn' },
				React.createElement(
					'button',
					{ className: 'visual-btn visual-btn-dark-outline',
						onClick: this.props.handleTabChange.bind(null, 'list') },
					React.createElement('i', { className: 'icon-line-arrow-left' }),
					' Back'
				)
			),
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-head' },
				React.createElement(
					'h3',
					null,
					'DNS Settings for ',
					React.createElement(
						'span',
						{ className: 'title-alt' },
						this.props.activeDomain['name']
					)
				),
				React.createElement(
					'p',
					null,
					'Here you can see DNS entries needed to connect your domain. Entries highlighted in red should be changed to correct data from required column. Log in to your domain provider to edit these settings. If you need help with changing DNS settings you can always contact your domain provider.'
				)
			),
			React.createElement(
				'div',
				{ className: 'visual-popup-metrics-body' },
				React.createElement(
					'div',
					{ className: 'visual-popup-domain-dns' },
					React.createElement(
						'div',
						{ className: 'visual-popup-domain-dns-row visual-popup-domain-dns-row-head' },
						React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-cell' },
							'HOST'
						),
						React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-cell' },
							'RECORD'
						),
						React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-cell' },
							'REQUIRED DATA'
						),
						React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-cell' },
							'CURRENT DATA'
						)
					),
					_.map(this.state.dns, function (item) {
						return React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-row visual-popup-domain-dns-row-body' },
							React.createElement(
								'div',
								{ className: 'visual-popup-domain-dns-cell' },
								item['required_data']['host']
							),
							React.createElement(
								'div',
								{ className: 'visual-popup-domain-dns-cell' },
								item['required_data']['type']
							),
							React.createElement(
								'div',
								{ className: 'visual-popup-domain-dns-cell' },
								item.code == 204 ? '' : item['required_data']['target']
							),
							React.createElement(
								'div',
								{ className: 'visual-popup-domain-dns-cell' },
								React.createElement(
									'span',
									{ className: item.code == 200 ? "text-green" : "text-red" },
									item.code == 404 ? "Record not found" : item['current_data']['target']
								)
							)
						);
					}),
					React.createElement(
						'div',
						{ className: 'visual-popup-domain-dns-row visual-popup-domain-dns-row-foot' },
						React.createElement(
							'div',
							{ className: 'visual-popup-domain-dns-cell' },
							React.createElement(
								'button',
								{ className: 'visual-btn visual-btn-dark', onClick: this.getDNS },
								'REFRESH'
							)
						)
					)
				)
			)
		);
	}
});

module.exports = DNS;

},{}],53:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._);

var UserData = React.createClass({
    displayName: 'UserData',

    render: function render() {
        return React.createElement(
            'form',
            null,
            React.createElement(
                'div',
                null,
                'First Name'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'first_name'), value: this.props.data.first_name })
            ),
            React.createElement(
                'div',
                null,
                'Last Name'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'last_name'), value: this.props.data.last_name })
            ),
            React.createElement(
                'div',
                null,
                'Org name'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'org_name'), value: this.props.data.org_name })
            ),
            React.createElement(
                'div',
                null,
                'Email'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', pattern: '^[\\w-]+(?:\\.[\\w-]+)*@(?:[\\w-]+\\.)+[a-zA-Z]{2,7}$', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'email'), value: this.props.data.email })
            ),
            React.createElement(
                'div',
                null,
                'Phone'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'phone'), value: this.props.data.phone })
            ),
            React.createElement(
                'div',
                null,
                'Address 1'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'address1'), value: this.props.data.address1 })
            ),
            React.createElement(
                'div',
                null,
                'Address 2'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', onChange: this.props.handleChange.bind(null, 'address2'), value: this.props.data.address2 })
            ),
            React.createElement(
                'div',
                null,
                'Address 3'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', onChange: this.props.handleChange.bind(null, 'address3'), value: this.props.data.address3 })
            ),
            React.createElement(
                'div',
                null,
                'City'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'city'), value: this.props.data.city })
            ),
            React.createElement(
                'div',
                null,
                'State'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'state'), value: this.props.data.state })
            ),
            React.createElement(
                'div',
                null,
                'Country'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'country'), value: this.props.data.country })
            ),
            React.createElement(
                'div',
                null,
                'Postal code'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', required: true, onChange: this.props.handleChange.bind(null, 'postal_code'), value: this.props.data.postal_code })
            ),
            React.createElement(
                'div',
                null,
                'Fax'
            ),
            React.createElement(
                'div',
                null,
                React.createElement('input', { className: 'form-control', type: 'text', onChange: this.props.handleChange.bind(null, 'fax'), value: this.props.data.fax })
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'button',
                    { onClick: this.props.onSave },
                    'Save'
                )
            )
        );
    }

});

module.exports = UserData;

},{}],54:[function(require,module,exports){
'use strict';

var React = (window.React);

var EmailAddress = React.createClass({
    displayName: 'EmailAddress',

    getInitialState: function getInitialState() {
        return {
            email: '',
            isActive: null
        };
    },
    componentDidMount: function componentDidMount() {
        this.getEmail();
    },
    onSaveEmail: function onSaveEmail(event) {
        event.preventDefault();
        if (/^[-._a-z0-9]+@(?:[a-zA-Z0-9][-a-z0-9]+\.)+[a-z]{2,6}$/.test(this.state.email)) {
            this.onChangeEmail('POST');
        } else {
            this.setState({
                success: false
            });
        }
    },
    onDisconnect: function onDisconnect(event) {
        event.preventDefault();
        this.onChangeEmail('DELETE');
    },
    onChangeEmail: function onChangeEmail(method) {
        var status = method == 'POST';
        this.props.sendRequest({
            url: 'api/registration/project/{%projectId%}/',
            type: method,
            data: {
                email: this.state.email
            },
            settingsKey: 'mandrill',
            callbackSuccess: (function (status) {
                this.setState({
                    isActive: method == 'POST' ? true : null,
                    email: status ? this.state.email : '',
                    success: status ? true : null
                });
            }).bind(this, status),
            callbackError: (function () {
                this.setState({
                    success: false
                });
            }).bind(this)
        });
    },

    onChange: function onChange(event) {
        var value = event.target.value;
        this.setState({
            email: value
        });
    },
    onConnect: function onConnect() {
        this.setState({
            isActive: false
        });
    },
    getEmail: function getEmail() {
        this.props.sendRequest({
            url: 'api/getUser/project/{%projectId%}/',
            type: 'GET',
            settingsKey: 'mandrill',
            callbackSuccess: (function (response) {
                this.setState({
                    email: response.data.email,
                    isActive: true
                });
            }).bind(this),
            callbackError: (function () {
                this.setState({
                    isActive: null
                });
            }).bind(this)
        });
    },
    renderDisconnectButton: function renderDisconnectButton() {
        return React.createElement(
            'button',
            { onClick: this.onDisconnect, className: 'visual-btn visual-btn-dark-outline visual-btn-full' },
            'Disconnect'
        );
    },
    getButtonConnect: function getButtonConnect() {
        return React.createElement(
            'button',
            { onClick: this.onConnect, className: 'visual-btn visual-btn-teal visual-btn-full' },
            'Connect Email'
        );
    },
    getFormContent: function getFormContent() {
        var formStatus = '',
            iconStatus = '';
        if (this.state.success) {
            formStatus = ' form-success';
            iconStatus = ' visual-icon-nav-check';
        } else if (this.state.success === false) {
            formStatus = ' form-error';
            iconStatus = ' visual-icon-remove-block';
        }

        return React.createElement(
            'form',
            { ref: 'form', className: "visual-popup-app-from" + formStatus },
            React.createElement(
                'div',
                { className: 'form-row' },
                React.createElement('input', { onChange: this.onChange,
                    placeholder: 'Enter your email address',
                    value: this.state.email,
                    className: 'visual-popup-metrics-body-email-input form-control'
                }),
                React.createElement('i', { className: "form-field-feedback" + iconStatus })
            ),
            React.createElement(
                'button',
                { onClick: this.onSaveEmail, className: 'visual-btn visual-btn-teal visual-btn-full' },
                'Save'
            ),
            this.state.isActive ? this.renderDisconnectButton() : null
        );
    },
    render: function render() {
        var content = this.state.isActive == null ? this.getButtonConnect() : this.getFormContent();
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols-right' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'Email Address'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-body-text' },
                React.createElement(
                    'p',
                    null,
                    'Connect your email address on which forms will send emails.'
                )
            ),
            content
        );
    }
});

module.exports = EmailAddress;

},{}],55:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._),
    Config = require('../../../../../../../../editor/js/global/Config'),
    Select = require('../../../../../../../../editor/js/component/controls/Select'),
    SelectItem = require('../../../../../../../../editor/js/component/controls/Select/SelectItem'),
    SettingsConfig = require('./../Config');

var appUrl = 'http://mailchimp.bitblox.me/auth/mailchimp/project/';

var MailChimp = React.createClass({
    displayName: 'MailChimp',

    getInitialState: function getInitialState() {
        return {
            list: [],
            success: null,
            isOpenList: false
        };
    },
    componentDidMount: function componentDidMount() {
        this.getList();
    },
    getList: function getList() {
        this.props.sendRequest({
            url: 'api/list/project/{%projectId%}/',
            settingsKey: 'mailchimp',
            callbackSuccess: (function (response) {
                var list = response.data,
                    isActive = _.findWhere(list, { active: true }) ? false : true;
                list.unshift({
                    name: 'Select List',
                    id: '',
                    active: isActive
                });
                this.setState({
                    list: list
                });
            }).bind(this)
        });
    },
    connect: function connect(event) {
        event.preventDefault();
        var url = appUrl + SettingsConfig.getProject() + '/signature/' + encodeURIComponent(SettingsConfig.getProjectHash('mailchimp'));
        var win = window.open(url, "", "width=600,height=600");
        var timer = setInterval((function () {
            if (win.closed) {
                clearInterval(timer);
                this.getList();
            }
        }).bind(this), 500);
    },
    disconnect: function disconnect(event) {
        event.preventDefault();
        this.props.sendRequest({
            url: 'api/list/project/{%projectId%}/',
            type: 'DELETE',
            settingsKey: 'mailchimp',
            callbackSuccess: (function () {
                this.setState({
                    list: [],
                    success: null
                });
            }).bind(this)
        });
    },
    changeList: function changeList(active) {
        var list = this.state.list,
            currentActive = _.pluck(list, 'active').indexOf(true);

        list[currentActive]['active'] = false;
        list[active]['active'] = true;

        this.setState({
            isOpenList: false,
            list: list
        });
    },
    selectList: function selectList(event) {
        var list = this.state.list,
            active = _.findWhere(list, { active: true });

        event.preventDefault();
        this.props.sendRequest({
            url: 'api/select_list/project/{%projectId%}',
            type: 'POST',
            settingsKey: 'mailchimp',
            data: {
                list_id: active.id
            },
            callbackSuccess: (function () {
                this.setState({
                    success: true
                });
            }).bind(this),
            callbackError: (function () {
                this.setState({
                    success: false
                });
            }).bind(this)
        });
    },
    renderButtonConnect: function renderButtonConnect() {
        return React.createElement(
            'button',
            { onClick: this.connect, className: 'visual-btn visual-btn-teal visual-btn-full' },
            'Connect MailChimp'
        );
    },
    renderSelectList: function renderSelectList() {
        var list = this.state.list,
            active = _.indexOf(list, _.findWhere(list, { active: true }));

        var status = '';
        if (this.state.success) {
            status = ' form-success';
        } else if (this.state.success === false) {
            status = ' form-error';
        }

        return React.createElement(
            'form',
            { className: "visual-popup-app-from" + status, onSubmit: this.changeEmail },
            React.createElement(
                'div',
                { className: 'form-row' },
                React.createElement(
                    Select,
                    {
                        className: 'visual-control-select-light',
                        defaultValue: active,
                        maxItems: 5,
                        itemHeight: 45,
                        onChange: this.changeList
                    },
                    this.renderOptions()
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-status' },
                React.createElement(
                    'button',
                    { onClick: this.selectList, className: 'visual-btn visual-btn-teal visual-btn-full' },
                    'Save'
                ),
                React.createElement(
                    'button',
                    { onClick: this.disconnect, className: 'visual-btn visual-btn-dark-outline visual-btn-full' },
                    'Disconnect'
                )
            )
        );
    },
    renderOptions: function renderOptions() {
        return _.map(this.state.list, function (item, index) {
            return React.createElement(
                SelectItem,
                { key: item.id, value: index },
                item.name
            );
        });
    },
    render: function render() {
        var content = _.isEmpty(this.state.list) ? this.renderButtonConnect() : this.renderSelectList();
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols-right' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'MailChimp'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-body-text' },
                React.createElement(
                    'p',
                    null,
                    'Subscribers will automatically be synced to your MailChimp list.'
                )
            ),
            content
        );
    }
});

module.exports = MailChimp;

},{"../../../../../../../../editor/js/component/controls/Select":86,"../../../../../../../../editor/js/component/controls/Select/SelectItem":85,"../../../../../../../../editor/js/global/Config":95,"./../Config":35}],56:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._),
    Globals = require('../../../../../../../../editor/js/global/Globals');

var APPS = {
    MailChimp: require("./MailChimp"),
    Email: require("./Email")
};

var Integration = React.createClass({
    displayName: 'Integration',

    getInitialState: function getInitialState() {
        return {
            list: [{
                title: 'MailChimp',
                img: 'http://i.imgur.com/mGZ7AKw.png',
                id: 'MailChimp'
            }, {
                title: 'Email',
                img: 'http://i.imgur.com/JDai6rg.png',
                id: 'Email'
            }],
            active: 'MailChimp'
        };
    },

    clickItem: function clickItem(activeId) {
        event.preventDefault();
        this.setState({
            active: activeId
        });
    },

    render: function render() {
        var tab = APPS[this.state.active];
        var props = {
            sendRequest: this.props.sendRequest
        };
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'INTEGRATION WITH APPS'
                ),
                React.createElement(
                    'p',
                    null,
                    'List of all default apps associated with this project:'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-cols-left visual-popup-metrics-divider-vertical' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-metrics-body' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-apps' },
                        _.map(this.state.list, (function (item, index) {
                            return React.createElement(
                                'div',
                                { className: "visual-popup-app-item" + (item.id == this.state.active ? " visual-popup-app-active" : ""),
                                    key: 'app' + index,
                                    onClick: this.clickItem.bind(null, item.id) },
                                React.createElement('img', { src: item.img, alt: '' }),
                                React.createElement(
                                    'span',
                                    { className: 'visual-popup-app-active-icon' },
                                    React.createElement('i', { className: 'visual-icon-nav-check' })
                                )
                            );
                        }).bind(this))
                    )
                )
            ),
            React.createElement(tab, props)
        );
    }
});

module.exports = Integration;

},{"../../../../../../../../editor/js/global/Globals":96,"./Email":54,"./MailChimp":55}],57:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React);

var CodeMirrorWrapper = React.createClass({
    displayName: 'CodeMirrorWrapper',

    getDefaultProps: function getDefaultProps() {
        onChange: _.noop;
    },
    componentDidMount: function componentDidMount() {
        var editor = CodeMirror.fromTextArea(this.getDOMNode(), {
            extraKeys: {
                "Ctrl-Space": 'autocomplete'
            },
            lineNumbers: true,
            indentUnit: 4,
            viewportMargin: 10
        });

        editor.doc.cm.on('change', (function (cm) {
            this.props.onChange(cm.doc.getValue());
        }).bind(this));
    },
    render: function render() {
        return React.createElement('textarea', { readOnly: true, defaultValue: this.props.value });
    }
});

module.exports = CodeMirrorWrapper;

},{}],58:[function(require,module,exports){
'use strict';

var _ = (window._);
var React = (window.React);
var Globals = require('../../../../../../../../editor/js/global/Globals');
var CodeMirror = require('./CodeMirror');

var StylesEditor = React.createClass({
    displayName: 'StylesEditor',

    onCodeMirrorChange: _.debounce(function (v) {
        Globals.set('userStyles', v, 'project');
    }, 1000),
    getCss: function getCss() {
        return Globals.get('userStyles') || '/* Add CSS ... */' + Array(16).join('\n'); // appends 15 new lines
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics-cols' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-head' },
                React.createElement(
                    'h3',
                    null,
                    'STYLES EDITOR:'
                ),
                React.createElement(
                    'p',
                    null,
                    'Write here all your custom css styles and it will be applied to your project.'
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-body' },
                React.createElement(CodeMirror, { value: this.getCss(), onChange: this.onCodeMirrorChange })
            )
        );
    }
});

module.exports = StylesEditor;

},{"../../../../../../../../editor/js/global/Globals":96,"./CodeMirror":57}],59:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);
var SettingsConfig = require('./Config');

module.exports = function (options) {
    var settingKey = options.settingsKey || 'domains',
        urlEncode = options['url'].replace("{%projectId%}", SettingsConfig.getProject()),
        url = settingKey == 'domains' ? SettingsConfig.getApiUrl() + urlEncode : SettingsConfig.getHost() + 'app/access/' + settingKey + '?url=' + urlEncode;

    jQuery.ajax({
        type: options.type,
        url: url,
        crossDomain: true,
        data: options.data,
        xhrFields: {
            withCredentials: true
        },
        success: function success(data) {
            options.success(data);
        },
        beforeSend: function beforeSend(request) {
            if (settingKey != 'domains') {
                request.setRequestHeader('X-Signature-Hmac-SHA256', SettingsConfig.getProjectHash(options.settingsKey));
            }
        },
        error: function error(_error) {
            options.error(_error);
        }
    });
};

},{"./Config":35}],60:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    ScrollPane = require('../../../../../../editor/js/component/ScrollPane'),
    TabHandlers = require('./Handlers'),
    TabPanels = require('./Panel');

var Settings = React.createClass({
    displayName: 'Settings',

    getInitialState: function getInitialState() {
        return {
            active: 'styles_editor' //  active tab content
        };
    },
    handleTabChange: function handleTabChange(active) {
        if (active !== this.state.active) {
            this.setState({
                active: active
            });
        }
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-popup-metrics clearfix' },
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-left' },
                React.createElement(TabHandlers, { onChange: this.handleTabChange, active: this.state.active })
            ),
            React.createElement(
                'div',
                { className: 'visual-popup-metrics-content' },
                React.createElement(
                    ScrollPane,
                    { style: { height: '100%' } },
                    React.createElement(TabPanels, { onChange: this.handleTabChange, active: this.state.active })
                )
            )
        );
    }
});

module.exports = Settings;

},{"../../../../../../editor/js/component/ScrollPane":64,"./Handlers":33,"./Panel":34}],61:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React);

function arrToggle(arr, value) {
	var index = arr.indexOf(value);
	var newArray = _.clone(arr);
	if (index === -1) {
		newArray.push(value);
	} else {
		newArray.splice(index, 1);
	}
	return newArray;
}

function getActiveTreeNodes(list, active) {
	var res = [];
	_.each(list, function (node) {
		var activeChildren = getActiveTreeNodes(node.children, active);
		if (node.id === active || activeChildren.length) {
			res.push(node.id);
		}
		res = _.union(res, activeChildren);
	});
	return res;
}

var TreeView = React.createClass({
	displayName: 'TreeView',

	getInitialState: function getInitialState() {
		return {
			opened: [],
			active: []
		};
	},
	getDefaultProps: function getDefaultProps() {
		return {
			data: [],
			active: '',
			onChange: _.noop,
			pre: _.noop
		};
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		if (nextProps.active) {
			this.setState({
				active: getActiveTreeNodes(nextProps.data, nextProps.active)
			});
		}
	},

	handleChange: function handleChange(node) {
		var active = node.id;
		if (node.children) {
			this.toggleFolder(node.id);
			active = node.children[0].id;
		} else {
			this.setState({
				active: getActiveTreeNodes(this.props.data, node.id)
			});
		}
		this.props.onChange(active);
	},
	toggleFolder: function toggleFolder(id) {
		var newState = {
			opened: arrToggle(this.state.opened, id)
		};
		this.setState(newState);
	},
	isActive: function isActive(id) {
		return this.state.active.indexOf(id) !== -1;
	},
	isOpen: function isOpen(id) {
		return this.state.opened.indexOf(id) !== -1;
	},
	getNode: function getNode(depth, node) {
		var icon;
		if (node.icon) {
			icon = this.props.pre(node.id);
		}

		var className = ['visual-popup-tabs-item', this.isActive(node.id) ? 'visual-popup-tabs-item-active' : ''].join(' ');

		var children;
		if (node.children) {
			children = this.getTree(node.children, depth + 1);
		}

		return React.createElement(
			'li',
			{ className: className, key: 'tab-item-' + node.id },
			React.createElement(
				'div',
				{ className: 'visual-popup-tabs-item-button', onClick: this.handleChange.bind(null, node) },
				icon,
				React.createElement(
					'span',
					null,
					node.title
				)
			),
			children
		);
	},
	getTree: function getTree(list, depth) {
		var items = _.map(list, this.getNode.bind(null, depth));

		var className = ['visual-popup-tabs', 'visual-popup-tabs-depth-' + depth].join(' ');

		return React.createElement(
			'ul',
			{ className: className },
			items
		);
	},
	render: function render() {
		return this.getTree(this.props.data, 0);
	}
});

module.exports = TreeView;

},{}],62:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    Navigation = require('./Navigation'),
    Metrics = require('./Metrics'),
    Settings = require('./Settings');

var TABS = {
    navigation: {
        title: 'PAGES',
        component: Navigation
    },
    metrics: {
        title: 'METRICS',
        component: Metrics
    },
    settings: {
        title: 'SETTINGS',
        component: Settings
    }
};

function getTabsData() {
    return TABS;
}

var Overlay = React.createClass({
    displayName: 'Overlay',

    getDefaultProps: function getDefaultProps() {
        return {
            activeTab: 'navigation',
            onOpen: function onOpen() {},
            onClose: function onClose() {}
        };
    },

    getInitialState: function getInitialState() {
        var tabsData = getTabsData(),
            activeTab;

        if (tabsData[this.props.activeTab]) {
            activeTab = this.props.activeTab;
        } else {
            activeTab = _.keys(tabsData)[0];
        }

        return {
            activeTab: activeTab,
            opened: false
        };
    },

    open: function open() {
        this.setState({
            opened: true
        });
        this.props.onOpen();
    },

    close: function close() {
        this.setState({
            opened: false
        });
        this.props.onClose();
    },

    onTabClick: function onTabClick(tab, event) {
        event.preventDefault();

        if (tab !== this.state.activeTab) {
            this.setState({
                activeTab: tab
            });
        }
    },

    renderTabControls: function renderTabControls() {
        var _this = this;
        var tabsData = getTabsData();
        var activeTabIndex = _.keys(tabsData).indexOf(_this.state.activeTab);

        var tabs = _.map(tabsData, function (tab, tabId) {
            var key = 'overlays-tab-control-' + tabId;
            var title = tab.title;
            var className = 'visual-large-popup-tab-item' + (_this.state.activeTab === tabId ? ' active' : '');
            return React.createElement(
                'div',
                {
                    key: key,
                    className: className,
                    onClick: _this.onTabClick.bind(null, tabId)
                },
                title
            );
        });

        return React.createElement(
            'div',
            { className: 'visual-large-popup-tabs visual-large-popup-tabs-' + _this.state.activeTab },
            tabs,
            React.createElement(
                'div',
                { className: 'visual-large-popup-tabs-track' },
                React.createElement(
                    'div',
                    { className: 'visual-large-popup-tabs-line', style: { transform: 'translateX(' + 190 * activeTabIndex + 'px)' } },
                    React.createElement('div', { className: 'visual-large-popup-tabs-line-inner' })
                )
            )
        );
    },

    renderTabs: function renderTabs() {
        var tabComponent = getTabsData()[this.state.activeTab].component;
        return React.createElement(
            'div',
            { className: 'visual-large-popup-body active' },
            React.createElement(tabComponent, { overlay: this })
        );
    },

    getClassName: function getClassName() {
        var className = 'visual-large-popup';
        className += ' visual-large-popup-' + this.state.activeTab;
        className += this.state.opened ? ' visual-large-popup-open' : ' visual-large-popup-closed';
        return className;
    },

    render: function render() {
        var className = this.getClassName();
        var tabControls = this.renderTabControls();
        var tabs = this.renderTabs();
        return React.createElement(
            'div',
            { className: className },
            React.createElement('div', { className: 'visual-large-popup-btn-close', onClick: this.close }),
            tabControls,
            tabs
        );
    }

});

module.exports = Overlay;

},{"./Metrics":21,"./Navigation":32,"./Settings":60}],63:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    SettingsOverlay = require('./Settings');

var Overlays = React.createClass({
	displayName: 'Overlays',

	componentDidMount: function componentDidMount() {
		var $node = jQuery(this.getDOMNode());

		$node.on('navOverlay.visual', (function () {
			this.refs.settings.open();
			jQuery('.visual-sidebar-block').trigger('closeSidebar.visual');
		}).bind(this));
	},
	onOverlayOpen: function onOverlayOpen() {
		jQuery('html').addClass('body-without-scroll');
	},
	onOverlayClose: function onOverlayClose() {
		jQuery('html').removeClass('body-without-scroll');
	},
	render: function render() {
		return React.createElement(
			'div',
			null,
			this.props.children,
			React.createElement(SettingsOverlay, {
				ref: 'settings',
				activeTab: 'navigation',
				onOpen: this.onOverlayOpen,
				onClose: this.onOverlayClose
			})
		);
	}
});

module.exports = Overlays;

},{"./Settings":62}],64:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    React = (window.React),
    Scrollable = require('./Scrollable'),
    Draggable = require('./Draggable');

// FIXME the container should behave the same as its content (e.g. float, position absolute, fixed)
//       currently all of this behavior should be defined in wrapper container
//
// Basic Example
// =============
//
// <Component.ScrollPane style={{width: 300, height: 200}}>
//     {content}
// </Component.ScrollPane>
//
// Customizing ScrollPane bars
// ===========================
//
// <Component.ScrollPane className="visual-scroll-pane" style={{width: 300, height: 200}}>
//     {content}
// </Component.ScrollPane>
//
// <style type="text/css>
//     .visual-scroll-pane > div { border-color: blue; }
//     .visual-scroll-pane .visual-wide-track { height: 10px; background: #eee; }
//     .visual-scroll-pane .visual-wide-thumb { height: 100%; background: #aaa; }
//     .visual-scroll-pane .visual-tall-track { width: 10px; background: #eee; }
//     .visual-scroll-pane .visual-tall-thumb { width: 100%; background: #aaa; }
// </style>

var ScrollPane = React.createClass({
	displayName: 'ScrollPane',

	_start: 0,
	_wide: {},
	_tall: {},
	getDefaultProps: function getDefaultProps() {
		return {
			className: 'visual-scroll-pane', // default style
			style: {},
			onlyWide: false,
			wrapScrollable: function wrapScrollable(item) {
				return item;
			}
		};
	},
	componentDidMount: function componentDidMount() {
		jQuery(window).on('resize', this.handleResize);
	},
	componentWillUnmount: function componentWillUnmount() {
		jQuery(window).off('resize', this.handleResize);
	},
	captureStart: function captureStart(event) {
		this._start = false;
	},
	handleResize: function handleResize() {
		this.forceUpdate();
	},
	handleUpdateDOM: function handleUpdateDOM(math, c) {
		var wideTrack = this.refs.wideTrack.getDOMNode(),
		    wideTrackHeight,
		    wideThumb = this.refs.wideThumb.getDOMNode(),
		    tallTrack = this.refs.tallTrack.getDOMNode(),
		    tallTrackWidth,
		    tallThumb = this.refs.tallThumb.getDOMNode(),
		    wide = {
			overflow: Math.max(0, c.scrollWidth - c.clientWidth)
		},
		    tall = {
			overflow: Math.max(c.scrollHeight - c.clientHeight)
		};

		wideTrack.style.position = 'absolute';
		tallTrack.style.position = 'absolute';
		wideThumb.style.position = 'relative';
		tallThumb.style.position = 'relative';

		wideTrack.style.display = 'block';
		wideTrackHeight = wideTrack.offsetHeight;
		tallTrack.style.display = 'block';
		tallTrackWidth = tallTrack.offsetWidth;

		c.style.overflow = 'hidden';
		c.style.borderBottomWidth = wideTrackHeight + 'px';
		c.style.borderBottomStyle = wide.overflow ? 'solid' : 'none';
		c.style.borderRightWidth = tallTrackWidth + 'px';
		c.style.borderRightStyle = tall.overflow ? 'solid' : 'none';

		// Previous step may lead to changing clientWidth/clientHeight
		wide.overflow = Math.max(0, c.scrollWidth - c.clientWidth);
		tall.overflow = Math.max(0, c.scrollHeight - c.clientHeight);

		wideTrack.style.display = wide.overflow ? 'block' : 'none';
		wideTrack.style.width = c.clientWidth + 'px';
		wideTrack.style.left = 0;
		wideTrack.style.top = c.offsetHeight - wideTrackHeight + 'px';

		tallTrack.style.display = tall.overflow ? 'block' : 'none';
		tallTrack.style.height = c.clientHeight + 'px';
		tallTrack.style.top = 0;
		// Previous step may lead to changing  track sizes
		this._wide = wide = math(c.clientWidth, c.offsetWidth, c.scrollWidth, c.scrollLeft, wideTrack.clientWidth);
		this._tall = tall = math(c.clientHeight, c.offsetHeight, c.scrollHeight, c.scrollTop, tallTrack.clientHeight);
		wideThumb.style.left = wide.shift + 'px';
		wideThumb.style.width = wide.thumb + 'px';
		tallThumb.style.top = tall.shift + 'px';
		tallThumb.style.height = tall.thumb + 'px';
	},
	handleWheel: function handleWheel(event) {
		var a = this.refs.scrollable.getDOMNode(),
		    top = a.scrollTop,
		    left = a.scrollLeft;
		var ua = navigator.userAgent.toLowerCase();

		var wheel_speed = 1;
		var isFirefox = /firefox/.test(ua);
		var isChrome = /chrome/.test(ua);

		if (isFirefox) wheel_speed = 20; // если браузре mozila, то прокрутка идет быстрее
		if (isChrome) wheel_speed = 0.8; // если браузре chrome, то прокрутка идет медленее

		// is only Wide
		if (this.props.onlyWide) {
			a.scrollLeft = left + (event.deltaX ? event.deltaX : event.deltaY * wheel_speed);
		} else {
			event.preventDefault(); // prevent scrolling the default body's scrollbar
			a.scrollTop = top + event.deltaY * wheel_speed;
			a.scrollLeft = left + event.deltaX;
		}
		if (a.scrollTop != top || a.scrollLeft != left || this.props.onlyWide) {
			// scroll happenedtall.shift
			event.preventDefault();
		}
	},
	handleMove: function handleMove(offset) {
		if (this._start === false) {
			this._start = parseInt(this.refs.wideThumb.getDOMNode().style.left);
		}
		var shift = offset.left + this._start,
		    position = shift / this._wide.piece * this._wide.overflow;
		this.refs.scrollable.getDOMNode().scrollLeft = position;
	},
	handleMove2: function handleMove2(offset) {
		if (this._start === false) {
			this._start = parseInt(this.refs.tallThumb.getDOMNode().style.top);
		}
		var shift = offset.top + this._start,
		    position = shift / this._tall.piece * this._tall.overflow;
		this.refs.scrollable.getDOMNode().scrollTop = position;
	},
	handleMouseDown: function handleMouseDown(event) {
		var track = this.refs.wideTrack.getDOMNode(),
		    rect = track.getBoundingClientRect(),
		    mouse = event.clientX - rect.left,
		    shift = mouse - this._wide.thumb / 2,
		    position = shift / this._wide.piece * this._wide.overflow;
		if (event.target === track) {
			this.refs.scrollable.getDOMNode().scrollLeft = position;
		}
	},
	handleMouseDown2: function handleMouseDown2(event) {
		var track = this.refs.tallTrack.getDOMNode(),
		    rect = track.getBoundingClientRect(),
		    mouse = event.clientY - rect.top,
		    shift = mouse - this._tall.thumb / 2,
		    position = shift / this._tall.piece * this._tall.overflow;
		if (event.target === track) {
			this.refs.scrollable.getDOMNode().scrollTop = position;
		}
	},
	handleSetPositionWide: function handleSetPositionWide(n) {
		this.handleMove({ top: 0, left: n });
	},
	render: function render() {
		return React.createElement(
			'div',
			{ className: this.props.className, style: { position: 'relative', width: this.props.style.width, height: this.props.style.height }, onWheel: this.handleWheel },
			React.addons.cloneWithProps(this.props.wrapScrollable(React.createElement(
				Scrollable,
				{ style: this.props.style, onUpdateDOM: this.handleUpdateDOM },
				this.props.children
			)), { ref: 'scrollable' }),
			React.createElement(
				Draggable,
				{ ref: 'wideTrack', onDragStart: this.captureStart, onDragMove: this.handleMove },
				React.createElement(
					'div',
					{ className: 'visual-wide-track', onMouseDown: this.handleMouseDown },
					React.createElement('div', { ref: 'wideThumb', className: 'visual-wide-thumb' })
				)
			),
			React.createElement(
				Draggable,
				{ ref: 'tallTrack', onDragStart: this.captureStart, onDragMove: this.handleMove2 },
				React.createElement(
					'div',
					{ className: 'visual-tall-track', onMouseDown: this.handleMouseDown2 },
					React.createElement('div', { ref: 'tallThumb', className: 'visual-tall-thumb' })
				)
			)
		);
	}
});

module.exports = ScrollPane;

},{"./Draggable":5,"./Scrollable":65}],65:[function(require,module,exports){
'use strict';

var React = (window.React);

var Scrollable = React.createClass({
	displayName: 'Scrollable',

	getDefaultProps: function getDefaultProps() {
		return {
			onUpdateDOM: function onUpdateDOM(math, container) {}
		};
	},
	componentDidMount: function componentDidMount() {
		this.updateDOM();
	},
	componentDidUpdate: function componentDidUpdate() {
		this.updateDOM();
	},
	updateDOM: function updateDOM() {
		var _this = this;
		// XXX Have no idea why does it work...
		setTimeout(function () {
			try {
				// sometimes the setTimeout callback can be invoked
				// when the component is not mounted, thus _this.getDOMNode()
				// would throw an Error
				_this.props.onUpdateDOM(_this.math, _this.getDOMNode());
			} catch (e) {
				console.log('Scrollable catch');
			}
		}, 1);
	},
	math: function math(client, offset, scroll, position, track) {
		// In Google Chrome, sometimes scrollSize is less than clientSize by 1
		scroll = Math.max(scroll, client);
		var overflow = scroll - client,
		    thumb = client / scroll * track,
		    piece = track - thumb,
		    shift = overflow == 0 ? 0 : position / overflow * piece;
		return {
			client: client,
			offset: offset,
			scroll: scroll,
			overflow: overflow,
			position: position,
			track: track,
			thumb: thumb,
			piece: piece,
			shift: shift
		};
	},
	render: function render() {
		return React.createElement(
			'div',
			{ style: this.props.style, onScroll: this.updateDOM },
			this.props.children
		);
	}
});

module.exports = Scrollable;

},{}],66:[function(require,module,exports){
'use strict';

'use stict';

var _ = (window._),
    React = (window.React);

// Known Issues
// ------------
//
// #1 It cannot detect change in size when absolutely positioned
// descendants is a cause to grow container size.
// Related articles:
//     * http://stackoverflow.com/q/12070759/1478566
//
// #2 It cannot detect change in size when floats are used without
// clearfix.
//
// Rule of Thumb
// -------------
//
// In order for this component to work correctly a HTML/CSS should
// be make so that a container will grow as large as necessary to
// contain all of its descendants.

var SizeMonitor = React.createClass({
    displayName: 'SizeMonitor',

    getDefaultProps: function getDefaultProps() {
        return {
            onSizeChange: function onSizeChange() {}
        };
    },
    componentDidMount: function componentDidMount() {
        var _this = this;

        this.refs['iframe'].getDOMNode().contentWindow.onresize = function () {
            return _this.props.onSizeChange();
        };
    },
    componentWillUnmount: function componentWillUnmount() {
        this.refs['iframe'].getDOMNode().contentWindow.onresize = null;
    },
    render: function render() {
        var props = _.omit(this.props, 'children', 'style', 'onSizeChange');
        props.style = _.extend({ position: 'relative' }, this.props.style);
        return React.createElement(
            'div',
            props,
            this.props.children,
            React.createElement('iframe', { ref: 'iframe', src: 'about:blank', style: { position: 'absolute', left: -1000000, top: -1000000, width: '100%', height: '100%' } })
        );
    }
});

module.exports = SizeMonitor;

},{}],67:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React);

var Bar = React.createClass({
    displayName: 'Bar',

    getDefaultProps: function getDefaultProps() {
        return {
            addEvent: true
        };
    },
    componentDidMount: function componentDidMount() {
        this.initBar();
    },
    componentWillUnmount: function componentWillUnmount() {
        jQuery(this.getDOMNode()).off('mouseleave', this.handleMouseLeave);
    },
    componentDidUpdate: function componentDidUpdate() {
        var $node = jQuery(this.getDOMNode());
        $node.off('visual.bar', this.handleVisualBar);
        this.initBar();
    },
    initBar: function initBar() {
        var $node = jQuery(this.getDOMNode());
        if (this.props.addEvent && !$node.is('.visual-bar-inited')) {
            if (this.props.trigger === 'click') {
                if ($node.find('.visual-bar-inited').length === 0) {
                    $node.on('click', this.handleClick);
                }
            } else {
                $node.on('mouseover', this.handleMouseEnter);
                $node.on('mouseleave', this.handleMouseLeave);
            }
            $node.addClass('visual-bar-inited');
        }
        $node.on('visual.bar', this.handleVisualBar);
    },
    handleClick: function handleClick() {
        jQuery(this.getDOMNode()).trigger('visual.bar', [{}]);
    },
    handleMouseEnter: function handleMouseEnter(e, a) {
        if (typeof a === 'undefined') {
            e.stopPropagation();
            jQuery(this.getDOMNode()).trigger('mouseover', ['barTriggerIt']).trigger('visual.bar', [{}]);
        }
    },
    handleMouseLeave: function handleMouseLeave(e, a) {
        if (typeof a === 'undefined') {
            e.stopPropagation();
            jQuery(this.getDOMNode()).trigger('mouseleave', ['barTriggerIt']).trigger('visual.bar-out');
        }
    },
    handleVisualBar: function handleVisualBar(event, data) {
        var item = _.extend({}, this.props);

        data.items = data.items || [];
        if (!data.items.noExtend) {
            data.inside = data.inside || !!item.inside; // once set to true remains this way
            data.menuBar = data.menuBar || !!item.menuBar; // once set to true remains this way
            data.locked = data.locked || !!item.locked; // once set to true remains this way
            data.offset = data.offset || item.offset; // once set remains unchanged

            if (_.isFunction(item.onBeforeShow)) {
                item.onBeforeShow(item);
            }

            if (!this.props.hideIt) {
                data.items.push(item);
            }
        }
    },
    render: function render() {
        return React.Children.only(this.props.children);
    }
});

module.exports = Bar;

},{}],68:[function(require,module,exports){
'use strict';

var React = (window.React);

var _BarItem = React.createClass({
    displayName: '_BarItem',

    componentDidMount: function componentDidMount() {

        // console.log('Link ---> ', this.props.value );

    },
    getDefaultProps: function getDefaultProps() {
        return {
            onClick: function onClick() {}
        };
    },
    handleClick: function handleClick(e) {
        e.stopPropagation();
        e.preventDefault();
        this.props.onClick();
    },
    render: function render() {

        var activeClass = this.props.value ? " visual-bar-btn-active" : "";

        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick },
            React.createElement(
                'div',
                { className: "visual-bar-btn" + activeClass },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-text-bold' })
            )
        );
    }
});

module.exports = _BarItem;

},{}],69:[function(require,module,exports){
'use strict';

var React = (window.React);

var BarClone = React.createClass({
    displayName: 'BarClone',

    getDefaultProps: function getDefaultProps() {
        return {
            active: true,
            debounce: true,
            onClick: function onClick() {}
        };
    },
    handleClick: function handleClick() {
        if (this.props.debounce) {
            this.props.manager.debounceBar();
        } else {
            this.props.manager.hideBar();
        }
        this.props.onClick();
    },
    render: function render() {
        var style = {
            display: this.props.active ? 'block' : 'none'
        };
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick, style: style },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-bar-clone' })
            )
        );
    }
});

module.exports = BarClone;

},{}],70:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    React = (window.React),
    BarTogglePopover = require('../../../../editor/js/mixin/BarTogglePopover');

var hexRegex = /(^(?:#|)[0-9A-F]{6}$)/i;

var BarColor = React.createClass({
    displayName: 'BarColor',

    mixins: [BarTogglePopover],
    getDefaultProps: function getDefaultProps() {
        return {
            value: '#000000',
            onPreview: function onPreview(color) {},
            onChange: function onChange(color) {}
        };
    },
    componentWillMount: function componentWillMount() {

        // holds the value of the component
        // workaround needed because this.props.value
        // supposed to be immutable
        this._v = this.props.value;

        // holds the current value for minicolors
        this._mv = this.props.value;
    },
    componentDidMount: function componentDidMount() {

        var $node = jQuery(this.getDOMNode());

        $node.find('.visual-bar-popover').on('selectstart', false);

        $node.on('click', function (event) {
            event.stopPropagation();
            event.preventDefault();
            var $content = jQuery('.bide-content', this);
            if ($content.is(':visible')) {
                $content.hide();
            } else {
                $content.show();
            }
        });

        this.lockChangeColor = false;

        jQuery(this.refs['colorpicker'].getDOMNode()).minicolors({
            inline: true,
            control: 'wheel',
            change: this.handleMinicolorsChange
        }).minicolors('value', this._mv);

        this.lockChangeColor = true;
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (this.props.value != nextProps.value) {
            this._v = nextProps.value;
            this._mv = nextProps.value;

            this.lockChangeColor = false;
            jQuery(this.refs['colorpicker'].getDOMNode()).minicolors('value', nextProps.value);
            this.lockChangeColor = true;
        }
    },
    shouldComponentUpdate: function shouldComponentUpdate() {
        return false;
    },
    componentWillUnmount: function componentWillUnmount() {
        if (this._v !== this._mv) {
            this.props.onChange(this._mv);
        }

        jQuery(this.refs['colorpicker'].getDOMNode()).minicolors('destroy');
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item' },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { ref: 'icon', className: 'visual-bar-icon visual-bar-icon-colorpicker' })
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-popover visual-bar-popover-colorpicker', onMouseUp: this.handleMouseUp },
                React.createElement('div', { ref: 'colorpicker', className: 'visual-bar-colorpicker', 'data-default-color': '#c41f97' }),
                React.createElement(
                    'div',
                    { className: 'visual-bar-colorpicker-footer bide-color-picker-footer' },
                    React.createElement('div', { ref: 'color', className: 'visual-bar-colorpicker-demo-color' }),
                    React.createElement(
                        'div',
                        { className: 'visual-bar-colorpicker-demo-hex' },
                        React.createElement('input', { ref: 'hex', type: 'text', onChange: this.handleInputChange })
                    ),
                    React.createElement('div', { ref: 'rgb', className: 'visual-bar-colorpicker-demo-rgb' })
                )
            )
        );
    },
    handleInputChange: function handleInputChange(event) {
        var value = event.target.value,
            isValidValue = hexRegex.test(value);

        if (isValidValue) {
            var correctedValue = value[0] === '#' ? value : '#' + value;
            if (correctedValue !== this._v) {
                this._v = correctedValue;
                this._mv = correctedValue;
                jQuery(this.refs['colorpicker'].getDOMNode()).minicolors('value', correctedValue);
                this.props.onChange(correctedValue);
            }

            //jQuery(event.target).focus();
        }
    },
    handleMouseUp: function handleMouseUp() {
        if (this._v !== this._mv) {
            this._v = this._mv;
            this.props.onChange(this._v);
        }
    },
    handleMinicolorsChange: function handleMinicolorsChange(hex) {
        var rgb = jQuery(this.refs['colorpicker'].getDOMNode()).minicolors('rgbObject');
        if (this._v != hex && this.lockChangeColor) {
            this._mv = hex;

            // we do not call this.props.onChange here
            // to not trigger rerenders to frequent
            // this.props.onChange will be called on mouseUp
            this.props.onPreview(hex);
        }
        jQuery(this.refs['icon'].getDOMNode()).css('background-color', hex);
        jQuery(this.refs['rgb'].getDOMNode()).text('R:' + rgb.r + ' G:' + rgb.g + ' B:' + rgb.b);
        jQuery(this.refs['hex'].getDOMNode()).val(hex);
        jQuery(this.refs['color'].getDOMNode()).css('background-color', hex);
    }
});

module.exports = BarColor;

},{"../../../../editor/js/mixin/BarTogglePopover":131}],71:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    _ = (window._),
    React = (window.React),
    ScrollPane = require('../../../../editor/js/component/ScrollPane'),
    BarTogglePopover = require('../../../../editor/js/mixin/BarTogglePopover'),
    decimalAdjust = require('../../../../editor/js/helper/utils/MiscUtils').decimalAdjust,
    editorFonts = require('../../../../editor/js/config/fonts');

var consts = {
    size: {
        LIMIT_UP: 99,
        LIMIT_DOWN: 6,
        STEP: 1
    },
    height: {
        LIMIT_UP: 5,
        LIMIT_DOWN: 1,
        STEP: 0.1
    },
    spacing: {
        LIMIT_UP: 20,
        LIMIT_DOWN: 0.5,
        STEP: 1
    }
};

var fontSizeMap = {
    'default': "16px",
    great_vibes: "18px",
    alex_brush: "18px",
    allura: "18px",
    parisienne: "18px"
};

function _check(v, min, max) {
    if (isNaN(v)) return max / 2;
    if (v < min) return min;
    if (v > max) return max;

    return v;
}

function _increase(type, v) {
    function a(v, min, max, step) {
        var cv = _check(parseFloat(v), min, max),
            i = min;
        while (i <= cv && i < max) i = decimalAdjust('round', i + step, -1);
        return i;
    }

    function b(v, min, max, step) {
        return Math.floor(_check(parseInt(v) + step, min, max));
    }

    var c = consts[type];
    return type === 'height' ? a(v, c.LIMIT_DOWN, c.LIMIT_UP, c.STEP) : b(v, c.LIMIT_DOWN, c.LIMIT_UP, c.STEP);
}

function _decrease(type, v) {
    function a(v, min, max, step) {
        var cv = _check(parseFloat(v), min, max),
            i = max;
        while (i >= cv && i > min) i = decimalAdjust('round', i - step, -1);
        return i;
    }

    function b(v, min, max, step) {
        return Math.floor(_check(parseInt(v) - step, min, max));
    }

    var c = consts[type];
    return type === 'height' ? a(v, c.LIMIT_DOWN, c.LIMIT_UP, c.STEP) : b(v, c.LIMIT_DOWN, c.LIMIT_UP, c.STEP);
}

function _calculateState(v) {
    var size = parseInt(v.size),
        height = /-/.test(v.height) ? v.height.replace('-', '.') : decimalAdjust('round', parseFloat(v.height) / size, -1),
        // em
    spacing = parseInt(v.spacing);

    return {
        size: size,
        height: height,
        spacing: spacing
    };
}

var BarFont = React.createClass({
    displayName: 'BarFont',

    mixins: [BarTogglePopover],

    getDefaultProps: function getDefaultProps() {
        return {
            onChange: function onChange() {},
            onClick: function onClick() {}
        };
    },

    getInitialState: function getInitialState() {
        var value = this.props.value,
            align = value.align;

        return _.extend(_calculateState(value), { align: align });
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        var cv = this.props.value;
        var nv = nextProps.value;
        var needsStateChange = cv.size !== nv.size || cv.height !== nv.height || cv.spacing !== nv.spacing;

        if (needsStateChange) {
            this.setState(_calculateState(nv));
        }
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item' },
            React.createElement(
                'div',
                { className: 'visual-bar-btn', onClick: this.handleButtonClick },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-text-font' })
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-popover visual-bar-fonts' },
                this.renderFonts(),
                this.renderSettings()
            )
        );
    },

    renderFonts: function renderFonts() {
        var fonts = _.map(editorFonts, (function (font, key) {
            return React.createElement(
                'div',
                {
                    key: font.family,
                    className: 'visual-bar-font-name',
                    onClick: this.handleFontClick.bind(null, key),
                    style: {
                        fontFamily: font.family,
                        fontSize: fontSizeMap[key] || fontSizeMap['default']
                    } },
                font.title
            );
        }).bind(this));
        return React.createElement(
            'div',
            { className: 'visual-bar-fonts-left' },
            React.createElement(
                ScrollPane,
                { style: { height: 223 }, className: 'visual-scroll-pane' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-fonts-list' },
                    fonts
                )
            )
        );
    },

    renderSettings: function renderSettings() {
        var s = this.state,
            align,
            height = s.height % 1 === 0 ? parseInt(s.height).toFixed(1) : s.height; // appends .0 when s.height is integer

        switch (s.align) {
            case "start":
                s.align = "left";
                align = "center";
                break;
            case "left":
                align = "center";
                break;
            case "center":
                align = "right";
                break;
            case "right":
                align = "left";
                break;
            default:
                align = "left";
        }

        return React.createElement(
            'div',
            { className: 'visual-bar-fonts-right' },
            React.createElement(
                'div',
                { className: 'visual-bar-font-setting' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-label' },
                    'Size:'
                ),
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-field' },
                    React.createElement(
                        'div',
                        { className: 'visual-bar-font-value' },
                        s.size
                    ),
                    React.createElement('div', { className: 'visual-icon-arrow-dropdown', onClick: this.handleIncreaseClick.bind(null, 'size') }),
                    React.createElement('div', { className: 'visual-icon-arrow-dropdown', onClick: this.handleDecreaseClick.bind(null, 'size') })
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-font-setting' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-label' },
                    'Leading:'
                ),
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-field' },
                    React.createElement(
                        'div',
                        { className: 'visual-bar-font-value' },
                        height
                    ),
                    React.createElement('div', { className: 'visual-icon-arrow-dropdown', onClick: this.handleIncreaseClick.bind(null, 'height') }),
                    React.createElement('div', { className: 'visual-icon-arrow-dropdown', onClick: this.handleDecreaseClick.bind(null, 'height') })
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-font-setting' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-label' },
                    'Align:'
                ),
                React.createElement(
                    'div',
                    { className: 'visual-bar-font-field visual-bar-font-align' },
                    React.createElement('i', { onClick: this.setAlign.bind(null, align), className: "visual-icon-align-" + s.align })
                )
            )
        );
    },

    setAlign: function setAlign(type) {
        var s = {};
        s['align'] = type;
        this.setState(s);
        this.props.onChange(s);
    },

    handleButtonClick: function handleButtonClick() {
        this.props.onClick();
    },

    handleFontClick: function handleFontClick(font) {
        this.props.onChange({ family: editorFonts[font].family });
    },

    handleIncreaseClick: function handleIncreaseClick(type) {
        var s = {};
        s[type] = _increase(type, this.state[type]);
        this.setState(s);
        this.props.onChange(s);
    },

    handleDecreaseClick: function handleDecreaseClick(type) {
        var s = {};
        s[type] = _decrease(type, this.state[type]);
        this.setState(s);
        this.props.onChange(s);
    }

});

module.exports = BarFont;

},{"../../../../editor/js/component/ScrollPane":64,"../../../../editor/js/config/fonts":94,"../../../../editor/js/helper/utils/MiscUtils":127,"../../../../editor/js/mixin/BarTogglePopover":131}],72:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    React = (window.React),
    BarTogglePopover = require('../../mixin/BarTogglePopover');

var BarHeadings = React.createClass({
    displayName: 'BarHeadings',

    mixins: [BarTogglePopover],
    getDefaultProps: function getDefaultProps() {
        return {
            onChange: function onChange() {},
            onClick: function onClick() {}
        };
    },
    componentDidMount: function componentDidMount() {

        var _this = this,
            $button = jQuery(this.refs.btn.getDOMNode()),
            $list = jQuery(this.refs.headings_list.getDOMNode()),
            $items = $list.find('div[data-type]');

        $button.on('click', function () {
            _this.props.onClick();
        });

        $items.on('click', function (e) {
            // e.stopPropagation();
            // e.preventDefault();
            var type = jQuery(this).attr('data-type');

            if (jQuery(this).is('.visual-bar-heading-item-active')) {
                _this.props.onChange("");
                jQuery(this).removeClass('visual-bar-heading-item-active');
            } else {
                _this.props.onChange(type);
                $items.filter('.visual-bar-heading-item-active').removeClass('visual-bar-heading-item-active');
                jQuery(this).addClass('visual-bar-heading-item-active');
            }
            // return false;
        });
    },
    render: function render() {

        var headingsItems = [];

        for (var i = 1; i <= 4; i++) {
            var active = "";

            if ("h" + i === this.props.value) {
                active = " visual-bar-heading-item-active";
            }

            headingsItems.push(React.createElement(
                'div',
                { key: i, className: "visual-bar-heading-item" + active, 'data-type': "h" + i },
                'H',
                React.createElement(
                    'div',
                    { className: 'visual-bar-heading-num' },
                    i
                )
            ));
        }

        var activeClass = this.props.value && this.props.value != 'p' ? ' visual-bar-btn-active' : '';
        return React.createElement(
            'div',
            { className: 'visual-bar-item' },
            React.createElement(
                'div',
                { ref: 'btn', className: "visual-bar-btn" + activeClass },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-text-headings' })
            ),
            React.createElement(
                'div',
                { ref: 'headings_list', className: 'visual-bar-popover visual-bar-popover-headings' },
                headingsItems
            )
        );
    }
});

module.exports = BarHeadings;

},{"../../mixin/BarTogglePopover":131}],73:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    React = (window.React);

var BarIcon = React.createClass({
    displayName: 'BarIcon',

    getDefaultProps: function getDefaultProps() {
        return {
            value: '',
            onChange: function onChange(value) {}
        };
    },
    handleClick: function handleClick() {

        // to open the icon modal we need to make a little hack
        // because we need to trigger a custom jQuery event
        // but the prompts div is not our parent, so we reach to it
        // through the BarManager's div (which is the parent of the prompts one)
        var $manager = jQuery(this.props.manager.getDOMNode());
        $manager.find(' > div:first-child').trigger('promptIcon.visual', {
            title: '',
            value: this.props.value,
            onChange: this.props.onChange
        });
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-icons' })
            )
        );
    }
});

module.exports = BarIcon;

},{}],74:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    _ = (window._),
    React = (window.React),
    Promise = require('promise'),
    UIState = require('../../../../editor/js/global/UIState'),
    Notifications = require('../../../../editor/js/global/Notifications'),
    WebAPIUtils = require('../../../../editor/js/helper/utils/WebAPIUtils');

function getMagicNumbers(file) {
	return new Promise(function (resolve, reject) {
		var fileReader = new FileReader();
		fileReader.onload = function (e) {
			var arr = new Uint8Array(e.target.result).subarray(0, 4);
			var header = "";
			for (var i = 0; i < arr.length; i++) {
				header += arr[i].toString(16);
			}
			resolve(header);
		};
		fileReader.onerror = function () {
			reject('getMagicNumbers filereader error');
		};
		fileReader.readAsArrayBuffer(file);
	});
}

function getBase64(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.onload = function (e) {
			resolve(e.target.result);
		};
		reader.onerror = function () {
			reject("Error read file.");
		};
		reader.onabort = function () {
			reject("Abort read file.");
		};
		reader.readAsDataURL(file);
	});
}

function preloadImages(urls) {
	return Promise.all(_.map(urls, preloadImage));
}

function preloadImage(url) {
	return new Promise(function (resolve, reject) {
		var image = new Image();
		image.onload = function () {
			resolve();
		};
		image.onabort = function () {
			reject("Image load error.");
		};
		image.onerror = function () {
			reject("Image load error.");
		};
		image.src = url;
	});
}

var BarImage = React.createClass({
	displayName: 'BarImage',

	getDefaultProps: function getDefaultProps() {
		return {
			value: '',
			onPreload: function onPreload(v) {},
			onChange: function onChange(v) {}
		};
	},
	componentDidMount: function componentDidMount() {
		var _this = this;
		jQuery(this.refs.fileupload.getDOMNode()).on('change', function () {
			if (!this.files || !this.files[0]) {
				return;
			}

			Promise.resolve(this.files[0]).then(function (file) {
				var validExtension = /\.(png|gif|jpg|jpeg)$/.test(file.name);
				if (!validExtension) {
					throw { name: 'InvalidFile', message: 'Invalid extension' };
				}
				return file;
			}).then(function (file) {
				return getMagicNumbers(file).then(function (fileHeader) {
					if (fileHeader === '89504e47' || // image/png
					fileHeader === '47494638' || // image/gif
					fileHeader.slice(0, 4) === 'ffd8' // image/jpeg
					) {
							return file;
						} else {
						throw { name: 'InvalidFile', message: 'Invalid MIME type' };
					}
				})['catch'](function () {
					throw { name: 'InvalidFile', message: 'Invalid MIME type' };
				});
			}).then(function (file) {
				UIState.set('isSaving', true);
				return getBase64(file).then(function (base64) {
					var strippedBase64 = base64.replace(/data:image\/(jpg|jpeg|png|gif);base64,/, '');
					var promise = WebAPIUtils.uploadImage({
						filename: file.name,
						base64: strippedBase64,
						size: _this.props.size
					});
					_this.props.onPreview(base64);
					return promise;
				});
			}).then(function (data) {
				return preloadImages(_.values(data)).then(function () {
					return data;
				});
			}).then(function (data) {
				_this.props.onChange(data);
			})['catch'](function (err) {
				if (err.name === 'InvalidFile') {
					Notifications.addNotification({
						id: 'image-upload-fail',
						type: Notifications.notificationTypes.error,
						text: 'The uploaded file is not supported. Only JPG, PNG or GIFs allowed.'
					});
				}
				console.warn(err);
			});
		});
	},
	render: function render() {
		return React.createElement(
			'div',
			{ className: 'visual-bar-item' },
			React.createElement(
				'label',
				{ className: 'visual-bar-item-image-label' },
				React.createElement('input', { className: 'visual-bar-item-image-field', type: 'file', ref: 'fileupload', style: { visibility: "hidden" }, accept: '.jpeg, .jpg, .png, .gif' }),
				React.createElement(
					'div',
					{ className: 'visual-bar-btn' },
					React.createElement('i', { className: 'visual-bar-icon visual-icon-images' })
				)
			)
		);
	}
});

module.exports = BarImage;

},{"../../../../editor/js/global/Notifications":97,"../../../../editor/js/global/UIState":101,"../../../../editor/js/helper/utils/WebAPIUtils":130,"promise":"promise"}],75:[function(require,module,exports){
'use strict';

var React = (window.React);

var _BarItem = React.createClass({
    displayName: '_BarItem',

    getDefaultProps: function getDefaultProps() {
        return {
            onClick: function onClick() {}
        };
    },
    handleClick: function handleClick() {
        this.props.onClick();
    },
    render: function render() {

        // console.log("this.props.value -->", this.props.value);

        var activeClass = this.props.value ? " visual-bar-btn-active" : "";

        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick },
            React.createElement(
                'div',
                { className: "visual-bar-btn" + activeClass },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-text-italic' })
            )
        );
    }
});

module.exports = _BarItem;

},{}],76:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    Model = require('../../../../editor/js/Model'),
    Pages = require('../../../../editor/js/global/Pages'),
    Router = require('../../../../editor/js/global/Router'),
    ScrollPane = require('../../../../editor/js/component/ScrollPane'),
    ProjectUtils = require('../../../../editor/js/helper/utils/ProjectUtils');

var DROPDOWN_METRICS = {
	minHeight: 40,
	maxHeight: 223,
	pageItemHeight: 39
};

function isDropdownOnTop(node) {
	var $window = jQuery(window),
	    $node = jQuery(node),
	    dm = DROPDOWN_METRICS;
	return $window.height() - ($node.offset().top + $node.height() - $window.scrollTop() + 30) < dm.maxHeight;
	// 30px - height of empty space at the bottom, after plus
}

function getDropdownHeight(pages) {
	var minHeight = DROPDOWN_METRICS.minHeight,
	    maxHeight = DROPDOWN_METRICS.maxHeight,
	    pageItemHeight = DROPDOWN_METRICS.pageItemHeight,
	    pagesHeight = pages.length * pageItemHeight + 2; // TODO: why + 10 ?    + 2 (indents wrap items)
	return Math.max(minHeight, Math.min(maxHeight, pagesHeight));
}

var pageRegex = /^page:([\w-]*)$/;
var anchorRegex = /^#(block-[\w-]*)$/;
var Tabs = {
	EXTERNAL: 0,
	INTERNAL: 1,
	ANCHOR: 2
};
var EditLink = React.createClass({
	displayName: 'EditLink',

	getDefaultProps: function getDefaultProps() {
		return {
			value: '',
			onChange: _.noop
		};
	},
	getInitialState: function getInitialState() {
		this.multiPageMode = ProjectUtils.isMultiPage();

		return _.extend({
			dropdownOpened: false,
			tab: '',
			externalText: '',
			internalText: '',
			anchorText: '',
			externalValue: '',
			internalValue: '',
			anchorValue: ''
		}, getComputedState.call(this, this.props.value));

		function getComputedState(v) {
			if (this.multiPageMode && pageRegex.test(v)) {
				var pageId = pageRegex.exec(v)[1];
				return {
					tab: Tabs.INTERNAL,
					internalText: this.getPageTitleById(pageId),
					internalValue: v
				};
			} else if (anchorRegex.test(v)) {
				var blockId = anchorRegex.exec(v)[1];
				return {
					tab: Tabs.ANCHOR,
					anchorText: this.getBlockTitleById(blockId),
					anchorValue: v
				};
			} else {
				return {
					tab: Tabs.EXTERNAL,
					externalText: v,
					externalValue: v
				};
			}
		}
	},
	componentDidMount: function componentDidMount() {
		this.focusInput();
	},
	focusInput: function focusInput() {
		var input = this.refs.input.getDOMNode();

		// little hack to focus the input
		// at the end of it's text
		var len = input.value.length;
		if (input.setSelectionRange) {
			input.focus();
			input.setSelectionRange(len, len);
		} else if (input.createTextRange) {
			var range = input.createTextRange();
			range.collapse(true);
			range.moveEnd('character', len);
			range.moveStart('character', len);
		}

		this.setState({ dropdownOpened: true });
	},
	handleTabChange: function handleTabChange(tab) {
		this.setState({ tab: tab }, function () {
			this.focusInput();
		});
	},
	handleInputChange: function handleInputChange(e) {
		var s = {};
		switch (this.state.tab) {
			case Tabs.EXTERNAL:
				s.externalText = e.target.value;
				s.externalValue = e.target.value;
				break;
			case Tabs.INTERNAL:
				s.internalText = e.target.value;
				s.internalValue = '';
				break;
			case Tabs.ANCHOR:
				s.anchorText = e.target.value;
				s.anchorValue = '';
				break;
		}
		this.setState(s);
	},
	handleInputKeyDown: function handleInputKeyDown(e) {
		if (e.keyCode === 13) {
			e.preventDefault();
			this.handleSave();
		}
	},
	handlePageItemClick: function handlePageItemClick(pageData) {
		this.setState({
			dropdownOpened: false,
			internalValue: 'page:' + pageData.id,
			internalText: pageData.title
		});
	},
	handleAnchorItemClick: function handleAnchorItemClick(anchorData) {
		this.setState({
			dropdownOpened: false,
			anchorValue: '#' + anchorData.id,
			anchorText: anchorData.title
		});
	},
	handleSave: function handleSave() {
		var v = '';
		switch (this.state.tab) {
			case Tabs.EXTERNAL:
				v = this.state.externalValue;
				break;
			case Tabs.INTERNAL:
				v = this.state.internalValue;
				break;
			case Tabs.ANCHOR:
				v = this.state.anchorValue;
				break;
		}
		this.props.onChange(v);
	},
	getPageTitleById: function getPageTitleById(pageId) {
		var page = _.findWhere(Pages.getPages(), { id: pageId });
		return page && page.title;
	},
	getCurrentBlocks: function getCurrentBlocks() {
		var activePageId = Router.getActivePageId(),
		    page = Pages.getPageById(activePageId);
		return page.data ? JSON.parse(page.data).container : [];
	},
	getBlockTitleById: function getBlockTitleById(blockId) {
		var block = _.find(this.getCurrentBlocks(), function (block) {
			return block.value.blockId === blockId;
		});
		return block && Model[block.type].visual.title;
	},
	renderTabs: function renderTabs() {
		var internalClass = this.state.tab === Tabs.INTERNAL ? ' visual-bar-link-active' : '';
		var anchorClass = this.state.tab === Tabs.ANCHOR ? ' visual-bar-link-active' : '';
		var externalClass = this.state.tab === Tabs.EXTERNAL ? ' visual-bar-link-active' : '';

		var anchorTab = React.createElement(
			'div',
			{
				className: "visual-bar-link-internal" + anchorClass,
				onClick: this.handleTabChange.bind(this, Tabs.ANCHOR)
			},
			'Anchor'
		);

		var internalTab = this.multiPageMode ? React.createElement(
			'div',
			{
				className: "visual-bar-link-internal" + internalClass,
				onClick: this.handleTabChange.bind(this, Tabs.INTERNAL)
			},
			'Page'
		) : null;

		var externalTab = React.createElement(
			'div',
			{
				className: "visual-bar-link-external" + externalClass,
				onClick: this.handleTabChange.bind(this, Tabs.EXTERNAL)
			},
			'Custom Link'
		);

		return React.createElement(
			'div',
			{ className: 'visual-bar-link-type' },
			internalTab,
			externalTab,
			anchorTab
		);
	},
	renderInput: function renderInput() {
		var s = this.state;

		var texts = {};
		texts[Tabs.EXTERNAL] = s.externalText;
		texts[Tabs.INTERNAL] = s.internalText;
		texts[Tabs.ANCHOR] = s.anchorText;

		var placeholders = {};
		placeholders[Tabs.EXTERNAL] = 'Enter an URL';
		placeholders[Tabs.INTERNAL] = 'Choose an existing page';
		placeholders[Tabs.ANCHOR] = 'Choose an existing anchor';

		var values = {};
		values[Tabs.EXTERNAL] = s.externalValue;
		values[Tabs.INTERNAL] = s.internalValue;
		values[Tabs.ANCHOR] = s.anchorValue;

		var arrowClassName = 'visual-bar-link-save visual-icon-arrow-save' + (values[s.tab] ? ' visual-bar-link-save-active' : '');

		return React.createElement(
			'div',
			{ className: 'visual-bar-link-form' },
			React.createElement('div', { className: 'visual-bar-link-icon-link visual-icon-link' }),
			React.createElement('input', {
				ref: 'input',
				className: 'visual-bar-link-field',
				type: 'text',
				value: texts[s.tab],
				placeholder: placeholders[s.tab],
				onChange: this.handleInputChange,
				onKeyDown: this.handleInputKeyDown,
				onFocus: this.focusInput
			}),
			React.createElement('div', {
				className: arrowClassName,
				onClick: this.handleSave
			})
		);
	},
	renderPages: function renderPages() {
		return Pages.getPages().filter(function (page) {
			var title = page.title;
			return title.search(new RegExp(this.state.internalText, 'i')) !== -1;
		}, this).map(function (page) {
			var pageData = {
				id: page.id,
				title: page.title
			};
			return React.createElement(
				'div',
				{
					key: 'page-' + pageData.id,
					className: 'visual-bar-link-local-item',
					onClick: this.handlePageItemClick.bind(null, pageData)
				},
				pageData.title
			);
		}, this);
	},
	renderAnchors: function renderAnchors() {
		return this.getCurrentBlocks().filter(function (block) {
			var title = Model[block.type].visual.title;
			return title.search(new RegExp(this.state.anchorText, 'i')) !== -1;
		}, this).map(function (block) {
			var anchorData = {
				id: block.value.blockId,
				title: Model[block.type].visual.title
			};
			return React.createElement(
				'div',
				{
					key: 'anchor-' + anchorData.id,
					className: 'visual-bar-link-local-item',
					onClick: this.handleAnchorItemClick.bind(null, anchorData)
				},
				anchorData.title
			);
		}, this);
	},
	renderDropdown: function renderDropdown() {
		var s = this.state;

		if (s.tab === Tabs.EXTERNAL) {
			return null;
		}

		var className = s.dropdownOpened ? 'visual-bar-toggle-popover-show' : 'visual-bar-toggle-popover-hidden';
		try {
			var node = this.getDOMNode();
			if (isDropdownOnTop(node)) {
				className += ' visual-bar-popover-bottom';
			}
		} catch (e) {
			// do nothing, the try is here to catch a potential
			// error when calling this.getDOMNode on an unmounted component
		}

		var options = s.tab == Tabs.ANCHOR ? this.renderAnchors() : this.renderPages();
		var style = {
			height: getDropdownHeight(options)
		};
		var noOptions = React.createElement(
			'div',
			{ className: 'visual-bar-link-local-item visual-bar-link-local-item-not-found' },
			this.multiPageMode ? 'No pages available' : 'No anchors available'
		);
		return React.createElement(
			'div',
			{ className: "visual-bar-popover visual-bar-link-dropdown " + className },
			React.createElement(
				ScrollPane,
				{ className: 'visual-scroll-pane', style: style },
				options.length ? options : noOptions
			)
		);
	},
	render: function render() {
		return React.createElement(
			'div',
			{ className: 'visual-bar-link' },
			this.renderTabs(),
			this.renderInput(),
			this.renderDropdown()
		);
	}
});

var BarLink = React.createClass({
	displayName: 'BarLink',

	getDefaultProps: function getDefaultProps() {
		return {
			onChange: _.noop,
			onClick: _.noop
		};
	},
	handleChange: function handleChange(v) {
		this.props.onChange(v);
		this.props.manager.unlockBar();
		this.props.manager.restoreBarContent();
	},
	switchToEdit: function switchToEdit(e) {
		e.stopPropagation();
		this.props.onClick();
		this.props.manager.lockBar();
		this.props.manager.setBarContent(React.createElement(EditLink, _extends({}, this.props, { onChange: this.handleChange })));
	},
	render: function render() {
		var activeClass = this.props.value ? ' visual-bar-btn-active' : '';
		return React.createElement(
			'div',
			{ className: 'visual-bar-item', onClick: this.switchToEdit },
			React.createElement(
				'div',
				{ className: "visual-bar-btn" + activeClass },
				React.createElement('i', { className: 'visual-bar-icon visual-icon-link' })
			)
		);
	}
});

module.exports = BarLink;

},{"../../../../editor/js/Model":1,"../../../../editor/js/component/ScrollPane":64,"../../../../editor/js/global/Pages":98,"../../../../editor/js/global/Router":100,"../../../../editor/js/helper/utils/ProjectUtils":128}],77:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Router = require('../../../../editor/js/global/Router'),
    createChainedFunction = require('../../../../editor/js/helper/utils/MiscUtils').createChainedFunction;

var _items = {
	link: require('./BarLink'),
	image: require('./BarImage'),
	icon: require('./BarIcon'),
	color: require('./BarColor'),
	opacity: require('./BarOpacity'),
	font: require('./BarFont'),
	bold: require('./BarBold'),
	italic: require('./BarItalic'),
	underline: require('./BarUnderline'),
	headings: require('./BarHeadings'),
	clone: require('./BarClone'),
	remove: require('./BarRemove'),
	video: require('./BarVideo'),
	map: require('./BarMap'),
	message: require('./BarMessage')
};

var _getPositionFromElement = function _getPositionFromElement(element) {
	var $element = jQuery(element);
	return {
		offset: {
			top: $element.offset().top,
			left: $element.offset().left
		},
		// width: $element.outerWidth(),
		// height: $element.outerHeight()
		// -- $element.outerWidth() and $element.outerHeight() do not work well with a css transformed element
		width: element.getBoundingClientRect().width,
		height: element.getBoundingClientRect().height
	};
};

var _createContentFromItems = function _createContentFromItems(items) {
	return _.map(items, renderItem.bind(this));

	function renderItem(item, index) {
		if (item.onChange) {
			item.onChange = createChainedFunction([(function (item, v) {
				item.value = v;
			}).bind(null, item), item.onChange]);
		}
		return React.createElement(this.items[item.item], _.extend({}, item, { manager: this, key: index }));
	}
};

var _positionBar = function _positionBar() {
	var s = this.state,
	    element = s.position || _getPositionFromElement(s.targetElement),
	    offset = {
		top: s.offset && s.offset.top || 0,
		left: s.offset && s.offset.left || 0
	},
	    $bar = jQuery(this.refs.bar.getDOMNode()),
	    $window = jQuery(window),
	    inside = s.inside;

	function findBarTop() {

		// 1. Check if $bar should go 'inside'
		if (inside) {
			// $bar.addClass('visual-bar-without-corner');
			return element.offset.top + 10;
		}

		// 2. place the $bar above / below
		else {
				// $bar.removeClass('visual-bar-without-corner');

				var isAbove = element.offset.top - $window.scrollTop() > $bar.outerHeight();
				if (isAbove) {
					$bar.removeClass('visual-bar-bottom');
					return element.offset.top - $bar.outerHeight();
				} else {
					$bar.addClass('visual-bar-bottom');
					return element.offset.top + element.height;
				}
			}
	}

	function findBarLeft() {
		var $corner = $bar.find('.visual-bar-corner'),
		    deltaX = $bar.outerWidth() - element.width,
		    barLeft = element.offset.left - deltaX / 2,
		    cornerLeft = -7,
		    // This magic number is set from Bar.css
		isCrampedLeft = function isCrampedLeft() {
			return barLeft < 0;
		},
		    isCrampedRight = function isCrampedRight() {
			return barLeft + $bar.outerWidth() > $window.width();
		};

		if (isCrampedLeft()) {
			cornerLeft += barLeft;
			barLeft = 0;
		} else if (isCrampedRight()) {
			var offsetRight = barLeft + $bar.outerWidth() - $window.width();
			cornerLeft += offsetRight;
			barLeft -= offsetRight;
		}

		var cornerPositionHasChanged = parseInt($corner.css('margin-left')) !== cornerLeft;
		if (cornerPositionHasChanged) {
			$corner.css('margin-left', cornerLeft);
		}

		return barLeft;
	}

	$bar.css({
		top: findBarTop() + offset.top,
		left: findBarLeft() + offset.left
	});
};

var _componentDidMount = function _componentDidMount() {
	var _this = this,
	    $node = jQuery(this.getDOMNode()),
	    $bar = jQuery(this.refs.bar.getDOMNode()),
	    tryHideBar = function tryHideBar() {
		//console.log('from try hide bar');
		if (!_this.state.locked) {
			//console.log('from try hide bar inside if');
			_this.hideBar();
		}
	};

	$bar.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function (e) {
		if ($bar.is('.visual-bar-wrapper-transition-text')) {
			$bar.removeClass('visual-bar-wrapper-transition-text').addClass('visual-bar-wrapper-show');
		}
	});

	// clicking outside a locked bar should close it
	jQuery(window).on('click', function (e) {
		//console.log('from window on click');

		if (!_this.state.visible || !_this.state.locked) {
			return;
		}

		if (_this.state.text) {

			//console.log('from window on click text 1');

			var $closest = jQuery(e.target).closest(_this.state.targetElement);
			if ($closest.length) {
				return;
				//console.log('from window on click text closest');
			}

			//console.log('from window on click text no closest');
			_this.hideBar(function () {
				jQuery(e.target).closest('.visual-bar-inited').trigger('visual.bar', [{}]);
			});
		} else {

			//console.log('from window on click notext 1');
			if (_this.state.targetElement === e.target) {
				return;
			}

			//console.log('from window on click notext before trigger');
			_this.hideBar(function () {
				//console.log('window.target', e.target);
				jQuery(e.target).closest('.visual-bar-inited').trigger('visual.bar', [{}]);
			});
		}
	});

	$node.on('visual-bar-suspend', function (event, data) {
		_this.hideBar();
		_this.setState({ active: false });
	});

	$node.on('visual-bar-resume', function (event, data) {
		_this.setState({ active: true });
	});

	$node.on('visual.bar', function (event, data) {

		// when a locked bar (includes text) is about to be shown
		// set a flag to prevent another bar to be show before it
		// this happens because when show bar sets the state it happens
		// asynchronously and a new bar might request to be shown
		if (_this.processing && !(data.locked || data.text)) {
			return;
		}

		if (data.locked || data.text) {
			_this.processing = true;
		}

		// do not show new bar if the current one is locked
		if (_this.state.locked && !data.text) {
			return;
		}

		// if there are no items then there is nothing to show
		if (!data.items || !data.items.length) {
			return;
		}

		_this.cancelHideBar();

		// prevents needles redraws of the bar
		// TODO: think if we need to bother about it or let React deal with it instead
		//console.log('from target compare1', event.target);
		//console.log('from target compare2', _this.state.targetElement);
		if (event.target === _this.state.targetElement && !data.text) {
			//console.log('from target compare if');
			return;
		}

		if (_this.state.targetElement !== event.target) {
			jQuery(_this.state.targetElement).removeClass('visual-has-locked-bar').trigger('visual-bar-translated.visual');
		}

		//console.log('before showBar');
		_this.showBar(_.extend(data, { targetElement: event.target }));
	});
	$node.on('visual.bar-out', function (e, data) {
		//console.log('from visual.bar-out', data);
		if (data && (data.text || data.force)) {
			_this.hideBar();
		} else {
			tryHideBar();
		}
	});

	$bar.on('mouseenter', function () {
		//console.log('from $bar.mouseenter');
		_this.cancelHideBar();
	});
	$bar.on('mouseleave', function () {
		//console.log('from $bar.mouseleave');
		tryHideBar();
	});

	// add special class that enables the plus sign to be displayed
	// when focused on the bar
	$bar.on('mouseenter', function () {
		jQuery(_this.state.targetElement).closest('.visual-wrap-block-item').addClass('visual-under-bar');
	});
	$bar.on('mouseleave', function () {
		jQuery(_this.state.targetElement).closest('.visual-wrap-block-item').removeClass('visual-under-bar');
	});

	// For mouseover editable block
	$bar.on('mouseenter', function () {
		var $trigger = jQuery(_this.state.targetElement);
		if ($trigger.is(".visual-mouseover-content-editable") || $trigger.closest('.visual-mouseover-content-editable').length > 0) {
			$trigger.trigger('visual.editableBlockOver');
		}
	});
	$bar.on('mouseleave', function () {
		var $trigger = jQuery(_this.state.targetElement);
		// console.log("amo this", _this);
		if ($trigger.is(".visual-mouseover-content-editable") || $trigger.length !== 0 && !$trigger.is(":hover")) {
			$trigger.trigger('visual.editableBlockOut');
		}
	});

	// For slider
	$bar.on('mouseenter', function () {
		var $trigger = jQuery(_this.state.targetElement);
		$trigger.closest('.owl-stage-outer').trigger('stop.player');
		//$trigger.closest('.visual-slider-set-height').trigger('mouseenter');
	});

	// For clone remove blocks
};

var BarManager = React.createClass({
	displayName: 'BarManager',

	_blinkLock: true,

	items: _items,
	hideTimeout: null,
	getInitialState: function getInitialState() {
		return {
			active: true,
			targetElement: null,
			content: null,
			position: null,
			offset: null,
			visible: false,
			locked: false,
			text: false,
			inside: false,
			transition: null,
			menuBar: false
		};
	},
	componentDidMount: function componentDidMount() {
		_componentDidMount.call(this);
		Router.addChangeListener(this.handleRouteChange);
	},
	componentWillUnmount: function componentWillUnmount() {
		Router.removeChangeListener(this.handleRouteChange);
	},
	showBar: function showBar(params) {

		//console.log('bar items', params.items);

		if (!this.state.active) {
			return;
		}

		if (this.state.transition === 'text') {
			jQuery(this.refs.bar.getDOMNode()).addClass('visual-bar-wrapper-transition-text');
		}

		var state = {
			targetElement: params.targetElement,
			items: params.items,
			content: _createContentFromItems.call(this, params.items),
			position: params.position,
			offset: params.offset,
			visible: true,
			locked: params.locked || params.text || false,
			text: params.text,
			inside: params.inside,
			transition: this.state.text ? 'text' : 'simple',
			menuBar: params.menuBar
		};

		if (this.state.text) {
			this.setState(state, function () {
				this.processing = false;
				if (this.state.locked) {
					// console.log("this.state.locked === true _____");
					jQuery(this.state.targetElement).addClass('visual-has-locked-bar');
				}
				_positionBar.call(this);
			});
		} else {
			var _this = this;

			// console.log("_this.state.locked ->", _this.state.locked);

			if (this._blinkLock) this.hideBar(function () {

				// this timeout helps bar transitions work
				// if it is not set then sometimes the
				// animation just happens instantly
				setTimeout(function () {

					_this.setState(state, function () {
						this.processing = false;
						if (this.state.locked) {
							// console.log("this.state.locked === true _____");
							jQuery(this.state.targetElement).addClass('visual-has-locked-bar');
						}
						_positionBar.call(this);
					});
				}, 100);
			});
		}
	},
	hideBar: function hideBar(cb) {
		if (this.hideTimeout !== null) {
			clearTimeout(this.hideTimeout);
		}
		this.hideTimeout = setTimeout((function () {
			this.hideTimeout = null;
			if (this.state.locked) {
				// console.log("this.state.locked === true");
				jQuery(this.state.targetElement).removeClass('visual-has-locked-bar').trigger('visual-bar-locked-hide.visual');
			}
			//console.log('xxxxxxxxxxx');
			jQuery(this.refs.bar.getDOMNode()).css({
				top: 0,
				left: 0
			});
			if (cb) {
				this.setState(_.omit(this.getInitialState(), 'active'), cb);
			} else {
				this.setState(_.omit(this.getInitialState(), 'active'));
			}
		}).bind(this), 10);
	},
	cancelHideBar: function cancelHideBar() {
		clearTimeout(this.hideTimeout);
		this.hideTimeout = null;
	},
	lockBar: function lockBar() {
		this._previousLocked = this.state.locked;
		this.setState({
			locked: true
		});
	},
	unlockBar: function unlockBar() {
		this.setState({
			locked: this._previousLocked
		});
	},
	setBarContent: function setBarContent(content) {
		this.setState({
			content: content
		}, function () {
			_positionBar.call(this);
		});
	},
	restoreBarContent: function restoreBarContent() {
		this.setState({
			content: null
		}, function () {
			_positionBar.call(this);
		});
	},
	debounceBar: function debounceBar() {
		var targetElement = this.state.targetElement;
		this.hideBar(function () {
			setTimeout(function () {
				jQuery(targetElement).closest('.visual-bar-inited').trigger('visual.bar', [{}]);
			}, 80);
		});
	},
	render: function render() {
		var className = '';
		if (this.state.transition) {
			className = this.state.transition === 'text' ? 'visual-bar-wrapper-transition-text' : 'visual-bar-wrapper-transition';
		}

		if (this.state.inside) {
			className += " visual-bar-without-corner";
		}

		if (this.state.menuBar) {
			className += " visual-bar-wrapper-menu";
		}

		var content = this.state.content || _createContentFromItems.call(this, this.state.items); //
		return React.createElement(
			'div',
			{ id: 'visualBarManager' },
			this.props.children,
			React.createElement(
				'div',
				{ ref: 'bar', id: 'visualBar', className: "visual-bar-wrapper " + className, onClick: this.handleBarClick },
				React.createElement(
					'div',
					{ className: 'visual-bar-wrapper-in' },
					React.createElement(
						'div',
						{ className: 'visual-bar' },
						content
					)
				),
				React.createElement('span', { className: 'visual-bar-corner' })
			)
		);
	},
	handleBarClick: function handleBarClick(event) {
		event.stopPropagation();
	},
	handleRouteChange: function handleRouteChange() {
		this.hideBar();
	}
});

module.exports = BarManager;

},{"../../../../editor/js/global/Router":100,"../../../../editor/js/helper/utils/MiscUtils":127,"./BarBold":68,"./BarClone":69,"./BarColor":70,"./BarFont":71,"./BarHeadings":72,"./BarIcon":73,"./BarImage":74,"./BarItalic":75,"./BarLink":76,"./BarMap":78,"./BarMessage":79,"./BarOpacity":81,"./BarRemove":82,"./BarUnderline":83,"./BarVideo":84}],78:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    Notifications = require('../../../../editor/js/global/Notifications'),
    getVideoUrl = require('../../../../editor/js/helper/utils/UrlUtils').getVideoUrl;

var EditMap = React.createClass({
    displayName: 'EditMap',

    getDefaultProps: function getDefaultProps() {
        return {
            value: '',
            onChange: function onChange() {}
        };
    },

    getInitialState: function getInitialState() {
        return {
            map: ''
        };
    },

    componentWillMount: function componentWillMount() {
        var map = this.props.value;

        this.setState({
            map: map
        });
    },

    componentDidMount: function componentDidMount() {
        this.focusInput();
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-video' },
            React.createElement(
                'div',
                { className: 'visual-bar-link-form' },
                React.createElement('div', { className: 'visual-bar-link-icon-link visual-icon-link' }),
                React.createElement('input', {
                    ref: 'input',
                    className: 'visual-bar-link-field',
                    type: 'text',
                    placeholder: 'Enter embeded map code',
                    value: this.state.map,
                    onChange: this.handleInputChange,
                    onKeyDown: this.handleInputKeyDown,
                    onFocus: this.focusInput
                }),
                React.createElement('div', { className: 'visual-bar-link-save visual-icon-arrow-save', onClick: this.handleSave })
            )
        );
    },

    handleInputChange: function handleInputChange(e) {
        this.setState({ map: e.target.value });
    },

    handleInputKeyDown: function handleInputKeyDown(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            this.handleSave();
        }
    },

    validateInput: function validateInput(input) {
        var $div = jQuery('<div>' + input + '</div>'),
            isIframe = $div.children().is('iframe') && $div.children().length === 1,
            isFromGoogle = /https:\/\/.*google\..*maps\/embed/i.test(input);

        return isIframe && isFromGoogle;
    },

    handleSave: function handleSave() {
        var s = this.state,
            _this = this,
            data = s.map;

        if (this.validateInput(data)) {
            _this.props.onChange(data);
        } else {
            Notifications.addNotification({
                id: 'map-insert-fail',
                type: Notifications.notificationTypes.error,
                text: 'The URL is not valid. Please use URL with <iframe> provided by Google Maps'
            });
        }
        _this.props.manager.unlockBar();
        _this.props.manager.restoreBarContent();
    },

    focusInput: function focusInput() {
        var input = this.refs.input.getDOMNode();

        function focus() {
            // little hack to focus the input
            // at the end of it's text
            var len = input.value.length;
            if (input.setSelectionRange) {
                input.focus();
                input.setSelectionRange(len, len);
            } else if (input.createTextRange) {
                var range = input.createTextRange();
                range.collapse(true);
                range.moveEnd('character', len);
                range.moveStart('character', len);
            }
        }

        focus();
    }

});

var BarMap = React.createClass({
    displayName: 'BarMap',

    getDefaultProps: function getDefaultProps() {
        return {
            onChange: _.noop,
            onClick: _.noop
        };
    },
    switchToEdit: function switchToEdit(e) {
        e.stopPropagation();
        this.props.onClick();
        this.props.manager.lockBar();
        this.props.manager.setBarContent(React.createElement(EditMap, this.props));
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.switchToEdit },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-map' })
            )
        );
    }
});

module.exports = BarMap;

},{"../../../../editor/js/global/Notifications":97,"../../../../editor/js/helper/utils/UrlUtils":129}],79:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    _ = (window._),
    React = (window.React),
    BarTogglePopover = require('../../../../editor/js/mixin/BarTogglePopover');

var BarButton = React.createClass({
    displayName: 'BarButton',

    mixins: [BarTogglePopover],

    getDefaultProps: function getDefaultProps() {
        return {
            onChange: function onChange() {},
            onClick: function onClick() {}
        };
    },

    getInitialState: function getInitialState() {
        var v = this.props.value;
        return {
            success: v.success,
            error: v.error
        };
    },

    onClickSave: function onClickSave(event) {
        event.preventDefault();

        var successMessage = this.state.success;
        var errorMessage = this.state.error;
        this.props.onChange({
            success: successMessage,
            error: errorMessage
        });
        this.mixinBarTogglePopoverHide();
    },

    onChangeText: function onChangeText(property, event) {
        var updateObj = this.state;
        updateObj[property] = event.target.value;
        this.setState(updateObj);
    },

    onButtonClick: function onButtonClick() {
        this.props.onClick();
    },

    renderSettings: function renderSettings() {
        return React.createElement(
            'div',
            { className: 'visual-bar-settings' },
            React.createElement(
                'div',
                { className: 'visual-bar-row' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-label' },
                    React.createElement('i', { className: 'visual-icon-nav-check2' })
                ),
                React.createElement(
                    'div',
                    { className: 'visual-bar-field' },
                    React.createElement('input', { className: 'visual-bar-field-success',
                        type: 'text',
                        defaultValue: this.state.success,
                        placeholder: 'Enter success message',
                        onChange: this.onChangeText.bind(null, 'success')
                    })
                )
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-row' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-label' },
                    React.createElement('i', { className: 'visual-icon-close' })
                ),
                React.createElement(
                    'div',
                    { className: 'visual-bar-field' },
                    React.createElement('input', { className: 'visual-bar-field-error',
                        type: 'text',
                        defaultValue: this.state.error,
                        placeholder: 'Enter error message',
                        onChange: this.onChangeText.bind(null, 'error')
                    }),
                    React.createElement('a', { href: '',
                        className: 'visual-bar-form-submit visual-icon-arrow-save',
                        onClick: this.onClickSave
                    })
                )
            )
        );
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item' },
            React.createElement(
                'div',
                { className: 'visual-bar-btn', onClick: this.onButtonClick },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-cog' })
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-popover visual-bar-form-styles' },
                this.renderSettings()
            )
        );
    }
});

module.exports = BarButton;

},{"../../../../editor/js/mixin/BarTogglePopover":131}],80:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery),
    React = (window.React);

var BarNoExtend = React.createClass({
	displayName: 'BarNoExtend',

	componentDidMount: function componentDidMount() {
		jQuery(this.getDOMNode()).on('visual.bar', this.handleVisualBar);
	},
	componentDidUpdate: function componentDidUpdate() {
		jQuery(this.getDOMNode()).off('visual.bar', this.handleVisualBar);
		jQuery(this.getDOMNode()).on('visual.bar', this.handleVisualBar);
	},
	handleVisualBar: function handleVisualBar(event, data) {
		data.items = data.items || [];
		data.items.noExtend = true;
	},
	render: function render() {
		return React.Children.only(this.props.children);
	}
});

module.exports = BarNoExtend;

},{}],81:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    BarTogglePopover = require('../../mixin/BarTogglePopover');

var BarOpacity = React.createClass({
    displayName: 'BarOpacity',

    mixins: [BarTogglePopover],
    getDefaultProps: function getDefaultProps() {
        return {
            value: 0,
            onPreview: function onPreview(value) {},
            onChange: function onChange(value) {}
        };
    },
    componentDidMount: function componentDidMount() {
        jQuery(this.refs.slider.getDOMNode()).slider({
            orientation: 'vertical',
            min: 0,
            max: 100,
            value: this.props.value,
            slide: this.handleSliderSlide,
            change: this.handleSliderChange
        });
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item' },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-sun' })
            ),
            React.createElement(
                'div',
                { className: 'visual-bar-popover visual-bar-opacity' },
                React.createElement(
                    'div',
                    { className: 'visual-bar-opacity-wrap' },
                    React.createElement('div', { ref: 'slider', className: 'visual-bar-opacity-slider' })
                ),
                React.createElement('i', { className: 'visual-bar-opacity-icon-top visual-icon-sun bide-icon-top' }),
                React.createElement('i', { className: 'visual-bar-opacity-icon-bottom visual-icon-sun bide-icon-bottom' })
            )
        );
    },
    handleSliderSlide: function handleSliderSlide(event, ui) {
        this.props.onPreview(ui.value);
    },
    handleSliderChange: function handleSliderChange(event, ui) {
        this.props.onChange(ui.value);
    }
});

module.exports = BarOpacity;

},{"../../mixin/BarTogglePopover":131}],82:[function(require,module,exports){
'use strict';

var React = (window.React);

var BarRemove = React.createClass({
    displayName: 'BarRemove',

    getDefaultProps: function getDefaultProps() {
        return {
            active: true,
            onClick: function onClick() {}
        };
    },
    handleClick: function handleClick() {
        this.props.manager.hideBar();
        this.props.onClick();
    },
    render: function render() {
        var style = {
            display: this.props.active ? 'block' : 'none'
        };
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick, style: style },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-bar-remove' })
            )
        );
    }
});

module.exports = BarRemove;

},{}],83:[function(require,module,exports){
'use strict';

var React = (window.React);

var _BarItem = React.createClass({
    displayName: '_BarItem',

    getDefaultProps: function getDefaultProps() {
        return {
            onClick: function onClick() {}
        };
    },
    handleClick: function handleClick() {
        this.props.manager.hideBar();
        this.props.onClick();
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.handleClick },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement(
                    'i',
                    { className: 'visual-bar-icon' },
                    'U'
                )
            )
        );
    }
});

module.exports = _BarItem;

},{}],84:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    Promise = require('promise'),
    getVideoUrl = require('../../../../editor/js/helper/utils/UrlUtils').getVideoUrl;

var EditVideo = React.createClass({
    displayName: 'EditVideo',

    embedlyKey: ':b1b4c76c6dd34f48a939beb4b16fbd0c',

    getDefaultProps: function getDefaultProps() {
        return {
            value: '',
            onChange: _.noop
        };
    },

    getInitialState: function getInitialState() {
        return {
            key: '',
            type: ''
        };
    },

    componentWillMount: function componentWillMount() {
        var key = getVideoUrl({
            key: this.props.value.key,
            type: this.props.value.type
        }, 'url');
        this.setState({
            key: key,
            type: this.props.value.type,
            format: this.props.value
        });
    },

    componentDidMount: function componentDidMount() {
        this.focusInput();
    },

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-video' },
            React.createElement(
                'div',
                { className: 'visual-bar-link-form' },
                React.createElement('div', { className: 'visual-bar-link-icon-link visual-icon-link' }),
                React.createElement('input', {
                    ref: 'input',
                    className: 'visual-bar-link-field',
                    type: 'text',
                    placeholder: 'Enter Youtube or Vimeo URL',
                    value: this.state.key,
                    onChange: this.handleInputChange,
                    onKeyDown: this.handleInputKeyDown,
                    onFocus: this.focusInput
                }),
                React.createElement('div', { className: 'visual-bar-link-save visual-icon-arrow-save', onClick: this.handleSave })
            )
        );
    },

    handleInputChange: function handleInputChange(e) {
        this.setState({ key: e.target.value });
    },

    handleInputKeyDown: function handleInputKeyDown(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            this.handleSave();
        }
    },

    //getFormat: function () {
    //    return new Promise(function(resolve, reject) {
    //        jQuery.ajax({
    //            okErrorStatuses: [404],
    //            type: 'GET',
    //            dataType: 'json',
    //            url: getApiUrl() + '/pages',
    //            data: {
    //                format: 'json',
    //                user: getUserId(),
    //                project: getProject()
    //            }
    //        });
    //    });
    //},

    checkUrl: function checkUrl(html) {
        var key, result, type;
        if (/(?:youtu\.be|youtube)/.test(html)) {
            result = html.match(/(?:v=|embed\/|youtu\.be\/)([A-Z0-9a-z\-_+%]*)(?:"|)/);
            type = "youtube";
        } else if (/(?:vimeo\.com)/.test(html)) {
            result = html.match(/vimeo\.com.*?\/([0-9]{1,20})/);
            type = "vimeo";
        } else {
            //result = html.match(/(http(?:s|):\/\/.+?(?:"|'|$))/);
            result = "";
            type = "other";
        }
        key = result && result[1] ? result[1] : ""; // save only valid urls
        return {
            key: key,
            type: type
        };
    },

    handleSave: function handleSave() {
        var s = this.state,
            _this = this,
            data = this.checkUrl(s.key);

        if (!(data.type == "other")) {
            jQuery.ajax({
                type: 'GET',
                url: "https://api.embedly.com/1/oembed",
                data: {
                    url: getVideoUrl(data),
                    key: _this.embedlyKey
                }
            }).done(function (response) {
                //var format = response.width * 3 / 4 == response.height ? "4:3" : "16:9";
                data.format = response.width + ":" + response.height;
                _this.props.onChange(data);
                _this.props.manager.unlockBar();
                _this.props.manager.restoreBarContent();
            });
        } else {
            _this.props.onChange(data);
            _this.props.manager.unlockBar();
            _this.props.manager.restoreBarContent();
        }
    },

    focusInput: function focusInput() {
        var input = this.refs.input.getDOMNode();

        function focus() {
            // little hack to focus the input
            // at the end of it's text
            var len = input.value.length;
            if (input.setSelectionRange) {
                input.focus();
                input.setSelectionRange(len, len);
            } else if (input.createTextRange) {
                var range = input.createTextRange();
                range.collapse(true);
                range.moveEnd('character', len);
                range.moveStart('character', len);
            }
        }

        focus();
    }

});

var BarVideo = React.createClass({
    displayName: 'BarVideo',

    getDefaultProps: function getDefaultProps() {
        return {
            onChange: _.noop,
            onClick: _.noop
        };
    },
    switchToEdit: function switchToEdit(e) {
        e.stopPropagation();
        this.props.onClick();
        this.props.manager.lockBar();
        this.props.manager.setBarContent(React.createElement(EditVideo, this.props));
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-bar-item', onClick: this.switchToEdit },
            React.createElement(
                'div',
                { className: 'visual-bar-btn' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-videos' })
            )
        );
    }
});

module.exports = BarVideo;

},{"../../../../editor/js/helper/utils/UrlUtils":129,"promise":"promise"}],85:[function(require,module,exports){
'use strict';

var _ = (window._);
var React = (window.React);
var classnames = require('classnames');

var SelectItem = React.createClass({
    displayName: 'SelectItem',

    getClassName: function getClassName() {
        return classnames('visual-control-select-option', { active: this.props.value == this.props.active });
    },
    render: function render() {
        return React.createElement(
            'div',
            { className: this.getClassName(), onClick: this.props.onClick },
            this.props.children
        );
    }
});

module.exports = SelectItem;

},{"classnames":"classnames"}],86:[function(require,module,exports){
'use strict';

var _ = (window._);
var jQuery = (window.jQuery);
var React = (window.React);
var classnames = require('classnames');
var ScrollPane = require('../../../../../editor/js/component/ScrollPane');

function getDropdownHeight(itemsCount, itemHeight, minItems, maxItems) {
    var minHeight = itemHeight * minItems,
        maxHeight = itemHeight * maxItems,
        itemsHeight = itemsCount * itemHeight;
    return Math.max(minHeight, Math.min(maxHeight, itemsHeight));
}

var Select = React.createClass({
    displayName: 'Select',

    getDefaultProps: function getDefaultProps() {
        return {
            defaultValue: '',
            minItems: 1,
            maxItems: 5,
            itemHeight: 38
        };
    },
    getInitialState: function getInitialState() {
        return {
            isOpen: false,
            currentValue: this.props.defaultValue
        };
    },
    componentDidMount: function componentDidMount() {
        jQuery(window).on('click', this.onOutClick);
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (this.state.defaultValue !== nextProps.defaultValue) {
            this.setState({
                currentValue: nextProps.defaultValue
            });
        }
    },
    componentWillUnmount: function componentWillUnmount() {
        jQuery(window).off('click', this.onOutClick);
    },
    onOutClick: function onOutClick(event) {
        if (jQuery(event.target).closest(this.getDOMNode()).length === 0) {
            this.setState({
                isOpen: false
            });
        }
    },
    onSelectedClick: function onSelectedClick() {
        this.setState({
            isOpen: !this.state.isOpen
        });
    },
    onItemClick: function onItemClick(value) {
        this.setState({
            isOpen: false,
            currentValue: value
        });
        this.props.onChange(value);
    },
    getCurrent: function getCurrent() {
        return _.find(this.props.children, function (child) {
            return child.props.value === this.state.currentValue;
        }, this) || this.props.children[0];
    },
    renderOptions: function renderOptions() {
        return _.map(this.props.children, function (child, index) {
            return React.addons.cloneWithProps(child, {
                key: index,
                active: this.state.currentValue,
                onClick: this.onItemClick.bind(null, child.props.value)
            });
        }, this);
    },
    render: function render() {
        var current = this.getCurrent(),
            className = classnames('visual-control-select', this.props.className, { opened: this.state.isOpen });

        var scrollPaneStyle = {
            height: getDropdownHeight(React.Children.count(this.props.children), this.props.itemHeight, this.props.minItems, this.props.maxItems)
        };

        return React.createElement(
            'div',
            { className: className },
            React.createElement(
                'div',
                { className: 'visual-control-select-current', onClick: this.onSelectedClick },
                current
            ),
            React.createElement(
                'div',
                { className: 'visual-control-select-options' },
                React.createElement(
                    ScrollPane,
                    { style: scrollPaneStyle },
                    this.renderOptions()
                )
            )
        );
    }
});

module.exports = Select;

},{"../../../../../editor/js/component/ScrollPane":64,"classnames":"classnames"}],87:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var AutoScroll = React.createClass({
    displayName: 'AutoScroll',

    getDefaultProps: function getDefaultProps() {
        return {
            active: false,
            capture: false
        };
    },
    getInitialState: function getInitialState() {
        return {
            timer: null,
            scrollStrengthX: 0,
            scrollStrengthY: 0
        };
    },
    componentDidMount: function componentDidMount() {
        if (this.props.active && this.props.capture) {
            this.hook(true);
        }
    },
    componentWillUnmount: function componentWillUnmount() {
        if (this.props.active && this.props.capture) {
            this.hook(false);
        }
        this.attachTimer(false);
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        var attach;
        if ((this.props.active && this.props.capture) != (nextProps.active && nextProps.capture)) {
            this.hook(nextProps.active && nextProps.capture);
        }
        attach = nextProps.active && (this.state.scrollStrengthX || this.state.scrollStrengthY);
        if ((this.state.timer && 1) != attach) {
            this.attachTimer(attach);
        }
    },
    attachTimer: function attachTimer(attach) {
        if (this.state.timer) {
            clearInterval(this.state.timer);
        }
        if (attach) {
            this.setState({ timer: setInterval(this.handleTimer, 10) });
        } else {
            //this.setState({timer: null});
        }
    },
    handleTimer: function handleTimer() {
        var c = this.getDOMNode();
        c.scrollTop += this.state.scrollStrengthY * 15;
        c.scrollLeft += this.state.scrollStrengthX * 25;
    },
    hook: function hook(attach) {
        if (attach) {
            jQuery(document).on('mousemove', this.handleMouseMove);
        } else {
            jQuery(document).off('mousemove', this.handleMouseMove);
        }
    },
    render: function render() {
        var props = _.omit(this.props, 'children', 'active', 'capture');
        //return React.cloneElement(this.props.children, props);
        return React.addons.cloneWithProps(this.props.children, props);
    },
    handleMouseMove: function handleMouseMove(event) {
        var r = this.getDOMNode().getBoundingClientRect(),
            x = event.clientX,
            y = event.clientY,
            top1 = r.top,
            top2 = r.top + 50,
            bottom1 = r.bottom - 50,
            bottom2 = r.bottom,
            left1 = r.left,
            left2 = r.left + 50,
            right1 = r.right - 50,
            right2 = r.right,
            scrollStrengthX = 0,
            scrollStrengthY = 0;
        if (y <= top2) {
            scrollStrengthY = this.scrollStrength(y, top1, top2) - 1;
        }
        if (y >= bottom1) {
            scrollStrengthY = this.scrollStrength(y, bottom1, bottom2);
        }
        if (x <= left2) {
            scrollStrengthX = this.scrollStrength(x, left1, left2) - 1;
        }
        if (x >= right1) {
            scrollStrengthX = this.scrollStrength(x, right1, right2);
        }
        this.setScrollStrength(scrollStrengthX, scrollStrengthY);
    },
    scrollStrength: function scrollStrength(x, top, bottom) {
        return (Math.min(bottom, Math.max(top, x)) - top) / (bottom - top);
    },
    setScrollStrength: function setScrollStrength(scrollStrengthX, scrollStrengthY) {
        var s = this.state,
            attach = this.props.active && (scrollStrengthX || scrollStrengthY);
        if (Boolean(s.timer) != attach) {
            this.attachTimer(attach);
        }
        if (s.scrollStrengthX != scrollStrengthX || s.scrollStrengthY != scrollStrengthY) {
            this.setState({ scrollStrengthX: scrollStrengthX, scrollStrengthY: scrollStrengthY });
        }
    }
});

module.exports = AutoScroll;

},{}],88:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    _ = (window._);

var MouseFollower = React.createClass({
    displayName: 'MouseFollower',

    getDefaultProps: function getDefaultProps() {
        return {
            shiftX: 0,
            shiftY: 0,
            style: {},
            onMouseMove: function onMouseMove(listener, event) {
                var x = event.clientX + listener.props.shiftX,
                    y = event.clientY + listener.props.shiftY;
                listener.setState({ left: x, top: y });
                listener.props.onPointer(x, y);
            },
            onMouseUp: function onMouseUp(listener, event) {},
            onPointer: function onPointer(x, y) {}
        };
    },
    getInitialState: function getInitialState() {
        return {};
    },
    componentDidMount: function componentDidMount() {
        this.attach(true);
    },
    componentWillUnmount: function componentWillUnmount() {
        this.attach(false);
    },
    render: function render() {
        if (this.props.children) {
            //return React.cloneElement(this.props.children, {style: _.extend({}, this.props.style, this.state)});
            return React.addons.cloneWithProps(this.props.children, { style: _.extend({}, this.props.style, this.state) });
        }
        return null;
    },
    handleMouseMove: function handleMouseMove(event) {
        return this.props.onMouseMove(this, event);
    },
    handleMouseUp: function handleMouseUp(event) {
        return this.props.onMouseUp(this, event);
    },
    attach: function attach(_attach) {
        // mousemove, and mouseup handlers should be the same for both .on and .off methods
        var map = { mousemove: this.handleMouseMove, mouseup: this.handleMouseUp };
        if (_attach) {
            jQuery(document).on(map);
        } else {
            jQuery(document).off(map);
        }
    }
});

module.exports = MouseFollower;

},{}],89:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._),
    MouseFollower = require('./MouseFollower'),
    ListInsertionPointFinder = require('../../helper/dragdrop/insertionPoint/ListInsertionPointFinder'),
    arrayInsertion = require('../../helper/dragdrop/arrayInsertion'),
    arrayMove = require('../../helper/dragdrop/arrayMove'),
    arrayPreview = require('../../helper/dragdrop/arrayPreview');

var Sortable = React.createClass({
	displayName: 'Sortable',

	getDefaultProps: function getDefaultProps() {
		return {
			items: [],
			insertionPointFinder: ListInsertionPointFinder,
			onChange: function onChange(items) {},
			onChangeState: function onChangeState(active) {},
			onForwardMouseDown: function onForwardMouseDown(sortable, elem, index, event) {
				var selection = [index],
				    insertion = arrayInsertion(sortable.props.items, selection),
				    insertionPoint = index;
				sortable.start(selection, insertion, insertionPoint, elem, event);
				event.preventDefault();
			},
			renderContainer: function renderContainer(sortable, children) {
				var insertion = sortable.getInsertion();
				return React.createElement(
					'ol',
					{ className: 'sortable' },
					children,
					insertion ? sortable.renderFeedback(insertion) : null
				);
			},
			renderItem: function renderItem(sortable, item) {
				var className = null,
				    handleMouseDown = null;
				switch (item.type) {
					case 'item':
						handleMouseDown = sortable.createMouseDownHandler(item);
						break;
					case 'selection':
						return null;
					case 'insertion':
						className = 'placeholder';
						break;
					case 'feedback':
						break;
				}
				return React.createElement(
					'li',
					null,
					React.createElement(
						'div',
						{ className: className, onMouseDown: handleMouseDown },
						JSON.stringify(item)
					)
				);
			}
		};
	},
	getInitialState: function getInitialState() {
		return {
			selection: null,
			insertion: null,
			insertionPoint: null,
			feedback: null
		};
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		if (this.props.items !== nextProps.items) {
			this._insertionPointFinder = null;
		}
	},
	render: function render() {
		var props = _.omit(this.props, 'children', 'items', 'insertionPointFinder', 'onSortStart', 'onSortEnd', 'onSortUpdate', 'onChange', 'renderContainer', 'renderItem');
		return React.addons.cloneWithProps(this.props.renderContainer(this, this.renderChildren()), props);
	},
	renderChildren: function renderChildren() {
		return _.map(this.getPreview(), this.renderItem);
	},
	renderItem: function renderItem(item) {
		var elem = this.props.renderItem(this, item);
		if (elem) {
			//return React.cloneElement(elem, _.pick(item, 'ref', 'key'));
			return React.addons.cloneWithProps(elem, _.pick(item, 'ref', 'key'));
		}
		return null;
	},
	renderFeedback: function renderFeedback(insertion) {
		var item = { type: 'feedback', value: insertion[0] };
		return React.createElement(
			MouseFollower,
			this.state.feedback,
			this.renderItem(item)
		);
	},
	getSelection: function getSelection() {
		return this.state.selection;
	},
	getInsertion: function getInsertion() {
		return this.state.insertion;
	},
	getInsertionPoint: function getInsertionPoint() {
		return this.state.insertionPoint;
	},
	findInsertionPoint: function findInsertionPoint(x, y) {
		if (!this._insertionPointFinder) {
			this._insertionPointFinder = new this.props.insertionPointFinder(this, this.getPreview());
		}
		return this._insertionPointFinder.find(x, y);
	},
	getPreview: function getPreview() {
		var s = this.state;
		return arrayPreview(this.props.items, s.selection || [], s.insertion || [], s.insertionPoint);
	},
	createMouseDownHandler: function createMouseDownHandler(item) {
		return this.handleMouseDown.bind(null, item.ref, item.index);
	},
	start: function start(selection, insertion, insertionPoint, elem, event, feedbackProps) {
		var r,
		    feedback = {};
		if (elem) {
			r = elem.getDOMNode().getBoundingClientRect();
			feedback = _.extend({
				onPointer: this.updateInsertionPoint,
				//onPointer: function() {},
				onMouseUp: this.commit,
				shiftX: r.left - event.clientX,
				shiftY: r.top - event.clientY,
				style: {
					position: 'fixed',
					width: r.right - r.left,
					margin: 0,
					top: r.top,
					left: r.left,
					//opacity: 0.5,
					pointerEvents: 'none',
					zIndex: 1
				}
			}, feedbackProps);
		}
		this.setState({ selection: selection, insertion: insertion, insertionPoint: insertionPoint, feedback: feedback });
		this.props.onChangeState(true);
	},
	commit: function commit() {
		var s = this.state,
		    selection = s.selection,
		    insertion = s.insertion,
		    insertionPoint = s.insertionPoint;
		this.reset();
		this.props.onChange(arrayMove(this.props.items, selection || [], insertion || [], insertionPoint));
	},
	reset: function reset() {
		var s = this.state;
		if (s.selection || s.insertion || s.insertionPoint) {
			this.setState({ selection: null, insertion: null, insertionPoint: null });
		}
		this.props.onChangeState(false);
	},
	updateInsertionPoint: function updateInsertionPoint(x, y) {
		var insertionPoint = this.findInsertionPoint(x, y);
		if (this.state.insertionPoint !== insertionPoint) {
			this.setState({ insertionPoint: insertionPoint });
		}
	},
	handleMouseDown: function handleMouseDown(ref, index, event) {
		this.props.onForwardMouseDown(this, this.refs[ref], index, event);
	}
});

module.exports = Sortable;

},{"../../helper/dragdrop/arrayInsertion":104,"../../helper/dragdrop/arrayMove":105,"../../helper/dragdrop/arrayPreview":106,"../../helper/dragdrop/insertionPoint/ListInsertionPointFinder":112,"./MouseFollower":88}],90:[function(require,module,exports){
'use strict';

var React = (window.React),
    _ = (window._),
    MouseFollower = require('./MouseFollower'),
    TreeInsertionPointFinder = require('../../helper/dragdrop/insertionPoint/TreeInsertionPointFinder'),
    treeInsertion = require('../../helper/dragdrop/treeInsertion'),
    treeMap = require('../../helper/dragdrop/treeMap'),
    treePreview = require('../../helper/dragdrop/treePreview'),
    treeMove = require('../../helper/dragdrop/treeMove');

var SortableTree = React.createClass({
    displayName: 'SortableTree',

    getDefaultProps: function getDefaultProps() {
        return {
            root: { children: [] },
            insertionPointFinder: TreeInsertionPointFinder,
            onChange: function onChange(items) {},
            onChangeState: function onChangeState(active) {},
            onInsertionPoint: function onInsertionPoint(sortable, insertionPoint) {
                sortable.setInsertionPoint(insertionPoint);
            },
            onForwardMouseDown: function onForwardMouseDown(sortable, elem, path, event) {
                var selection = path,
                    insertion = treeInsertion(sortable.props.root, selection),
                    insertionPoint = path;
                sortable.start(selection, insertion, insertionPoint, elem, event);
                event.preventDefault();
            },
            renderContainer: function renderContainer(sortable, children, root) {
                var insertion = sortable.getInsertion();
                return React.createElement(
                    'ol',
                    { className: root ? 'sortable' : null },
                    children,
                    root && insertion ? sortable.renderFeedback(insertion) : null
                );
            },
            renderItem: function renderItem(sortable, item) {
                var className = null,
                    handleMouseDown = null;
                switch (item.type) {
                    case 'item':
                        handleMouseDown = sortable.createMouseDownHandler(item);
                        break;
                    case 'selection':
                        break;
                    case 'insertion':
                        className = 'placeholder';
                        break;
                    case 'feedback':
                        break;
                }
                return React.createElement(
                    'li',
                    null,
                    React.createElement(
                        'div',
                        { className: className, onMouseDown: handleMouseDown },
                        JSON.stringify(_.omit(item, 'children'))
                    ),
                    sortable.renderSubtree(item)
                );
            }
        };
    },
    getInitialState: function getInitialState() {
        return {
            selection: null,
            insertion: null,
            insertionPoint: null,
            feedback: null
        };
    },
    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        if (this.props.root !== nextProps.root) {
            this.invalidateInsertionPointFinder();
        }
    },
    render: function render() {
        var props = _.omit(this.props, 'children', 'root', 'insertionPointFinder', 'onChange', 'onForwardMouseDown', 'renderContainer', 'renderItem');
        return React.addons.cloneWithProps(this.props.renderContainer(this, this.renderChildren(), true), props);
    },
    renderChildren: function renderChildren() {
        return _.map(this.getPreview().children, this.renderItem);
    },
    renderSubtree: function renderSubtree(item) {
        var children;
        if (item.children.length == 0) {
            return null;
        }
        children = _.map(item.children, this.renderItem);
        return this.props.renderContainer(this, children, false, item);
    },
    renderItem: function renderItem(item) {
        var elem = this.props.renderItem(this, item);
        if (elem) {
            //return React.cloneElement(elem, _.pick(item, 'ref', 'key'));
            return React.addons.cloneWithProps(elem, _.pick(item, 'ref', 'key'));
        }
        return null;
    },
    renderFeedback: function renderFeedback(insertion) {
        var item = treeMap(insertion, function (node, path, index) {
            return { type: 'feedback', key: index, value: _.omit(node, 'children') };
        });
        return React.createElement(
            MouseFollower,
            this.state.feedback,
            this.renderItem(item)
        );
    },
    getSelection: function getSelection() {
        return this.state.selection;
    },
    getInsertion: function getInsertion() {
        return this.state.insertion;
    },
    getInsertionPoint: function getInsertionPoint() {
        return this.state.insertionPoint;
    },
    invalidateInsertionPointFinder: function invalidateInsertionPointFinder() {
        this._insertionPointFinder = null;
    },
    findInsertionPoint: function findInsertionPoint(x, y) {
        if (!this._insertionPointFinder) {
            this._insertionPointFinder = new this.props.insertionPointFinder(this, this.getPreview());
        }
        return this._insertionPointFinder.find(x, y);
    },
    setInsertionPoint: function setInsertionPoint(insertionPoint) {
        this.setState({ insertionPoint: insertionPoint });
    },
    getPreview: function getPreview() {
        var s = this.state;
        return treePreview(this.props.root, s.selection, s.insertion, s.insertionPoint || []);
    },
    createMouseDownHandler: function createMouseDownHandler(item) {
        return this.handleMouseDown.bind(null, item.ref, item.path);
    },
    start: function start(selection, insertion, insertionPoint, elem, event, feedbackProps) {
        var r,
            feedback = {};
        if (elem) {
            r = elem.getDOMNode().getBoundingClientRect();
            feedback = _.extend({
                onPointer: this.updateInsertionPoint,
                onMouseUp: this.commit,
                shiftX: r.left - event.clientX,
                shiftY: r.top - event.clientY,
                style: {
                    position: 'fixed',
                    width: r.right - r.left,
                    margin: 0,
                    top: r.top,
                    left: r.left,
                    //opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 1
                }
            }, feedbackProps);
        }
        this.setState({ selection: selection, insertion: insertion, insertionPoint: insertionPoint, feedback: feedback });
        this.props.onChangeState(true);
    },
    commit: function commit() {
        var s = this.state,
            selection = s.selection,
            insertion = s.insertion,
            insertionPoint = s.insertionPoint;
        this.reset();
        this.props.onChange(treeMove(this.props.root, selection, insertion, insertionPoint));
    },
    reset: function reset() {
        var s = this.state;
        if (s.selection || s.insertion || s.insertionPoint) {
            this.setState({ selection: null, insertion: null, insertionPoint: null });
        }
        this.props.onChangeState(false);
    },
    updateInsertionPoint: function updateInsertionPoint(x, y) {
        var insertionPoint = this.findInsertionPoint(x, y);
        if (!_.isEqual(this.state.insertionPoint, insertionPoint)) {
            this.props.onInsertionPoint(this, insertionPoint);
        }
    },
    handleMouseDown: function handleMouseDown(ref, path, event) {
        this.props.onForwardMouseDown(this, this.refs[ref], path, event);
    }
});

module.exports = SortableTree;

},{"../../helper/dragdrop/insertionPoint/TreeInsertionPointFinder":114,"../../helper/dragdrop/treeInsertion":119,"../../helper/dragdrop/treeMap":121,"../../helper/dragdrop/treeMove":122,"../../helper/dragdrop/treePreview":123,"./MouseFollower":88}],91:[function(require,module,exports){
'use strict';

var React = (window.React);

var Fixed = React.createClass({
	displayName: 'Fixed',

	getInitialState: function getInitialState() {
		return {
			translationIsEnded: true,
			visibility: false
		};
	},
	getDefaultProps: function getDefaultProps() {
		return {
			transition: false,
			onOverlayClick: function onOverlayClick() {}
		};
	},
	componentDidMount: function componentDidMount() {

		$('.visual-fixed-scroll', this.getDOMNode()).click((function (e) {
			var $this = $(e.target);
			if ($this.is('.visual-fixed-scroll')) {
				this.props.onOverlayClick();
			}
		}).bind(this));

		jQuery(this.getDOMNode()).on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', this.endTrasition);
	},
	endTrasition: function endTrasition() {
		this.setState({
			translationIsEnded: true
		});
	},
	open: function open() {
		this.setState({ visibility: true });
	},
	close: function close() {
		this.setState({
			translationIsEnded: false,
			visibility: false
		});
	},
	render: function render() {

		var visibilityClass = '';
		if (this.props.transition) {
			visibilityClass = this.state.visibility ? ' visual-fixed-enter-transition' : ' visual-fixed-leave-transition';

			if (!this.state.visibility && this.state.translationIsEnded) {
				visibilityClass += ' visual-fixed-hidden';
			}
		} else {
			visibilityClass = this.state.visibility ? ' visual-fixed-visible' : ' visual-fixed-hidden';
		}
		return React.createElement(
			'div',
			{ className: 'visual-fixed' + visibilityClass },
			React.createElement('div', { className: 'visual-fixed-overlay' }),
			React.createElement(
				'div',
				{ className: 'visual-fixed-scroll' },
				this.props.children
			)
		);
	}
});

module.exports = Fixed;

},{}],92:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    classnames = require('classnames'),
    Config = require('../../../../editor/js/global/Config'),
    ScrollPane = require('../../../../editor/js/component/ScrollPane'),
    Fixed = require('../../../../editor/js/component/prompts/Fixed');

var transformIcons = function transformIcons(icons) {
    var prefixList = ['lk-icon-', 'icon-', 'fa fa-'];
    var prefixRegex = new RegExp('(?:^' + prefixList.join('|^') + ')', 'i');

    return _.map(icons, function (icon) {
        return {
            title: icon.replace(prefixRegex, '').replace(/-/g, ' '),
            value: icon
        };
    });
};

var PromptIcon = React.createClass({
    displayName: 'PromptIcon',

    getInitialState: function getInitialState() {
        return {
            value: '',
            searchQuery: '',
            icons: transformIcons(Config.get('icons')),
            onChange: _.noop
        };
    },
    open: function open(params) {
        this.setState({
            value: params.value,
            onChange: params.onChange
        });
        this.refs.fixed.open();
    },
    close: function close() {
        this.setState(this.getInitialState());
        this.refs.fixed.close();
    },
    onIconClick: function onIconClick(iconClass) {
        this.state.onChange(iconClass);
        this.close();
    },
    onSearchQueryChange: function onSearchQueryChange(event) {
        this.setState({
            searchQuery: event.target.value
        });
    },
    renderIcons: function renderIcons() {
        var s = this.state,
            icons,
            regex;

        if (s.searchQuery) {
            regex = new RegExp(s.searchQuery, 'i');
            icons = _.filter(s.icons, function (icon) {
                return regex.test(icon.title);
            }, this);
        } else {
            icons = s.icons;
        }

        return _.map(icons, function (icon) {
            var className = classnames('visual-icons-grid-item', { active: icon.value === this.state.value });
            return React.createElement(
                'div',
                {
                    key: icon.value,
                    className: className,
                    onClick: this.onIconClick.bind(null, icon.value)
                },
                React.createElement(
                    'div',
                    { className: 'div-icons' },
                    React.createElement('i', { className: icon.value })
                )
            );
        }, this);
    },
    render: function render() {
        return React.createElement(
            Fixed,
            { ref: 'fixed', onOverlayClick: this.close, transition: true },
            React.createElement(
                'div',
                { className: 'visual-popup-wrapper' },
                React.createElement(
                    'div',
                    { className: 'visual-popup-header' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-tab-item' },
                        React.createElement('div', { className: 'visual-popup-tab-icon visual-icon-icons' }),
                        React.createElement(
                            'div',
                            { className: 'visual-popup-tab-name' },
                            'ICONS'
                        )
                    ),
                    React.createElement('div', { className: 'visual-popup-btn-close', onClick: this.close })
                ),
                React.createElement(
                    'div',
                    { className: 'visual-popup-content' },
                    React.createElement(
                        'div',
                        { className: 'visual-popup-body' },
                        React.createElement(
                            'div',
                            { className: 'visual-icons-search' },
                            React.createElement(
                                'div',
                                { className: 'form-wrap' },
                                React.createElement('input', { type: 'text',
                                    className: 'field-search',
                                    placeholder: 'Search icons',
                                    onChange: this.onSearchQueryChange,
                                    value: this.state.searchQuery
                                }),
                                React.createElement(
                                    'span',
                                    { className: 'field-search-icon' },
                                    React.createElement('i', { className: 'visual-icon-metric-search' })
                                )
                            )
                        ),
                        React.createElement(
                            ScrollPane,
                            { style: { height: 520 }, className: 'visual-scroll-pane' },
                            React.createElement(
                                'div',
                                { className: 'visual-icons-grid item-wrap' },
                                this.renderIcons()
                            )
                        )
                    )
                )
            )
        );
    }
});

module.exports = PromptIcon;

},{"../../../../editor/js/component/ScrollPane":64,"../../../../editor/js/component/prompts/Fixed":91,"../../../../editor/js/global/Config":95,"classnames":"classnames"}],93:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    PromptIcon = require('./PromptIcon');

var Prompts = React.createClass({
	displayName: 'Prompts',

	componentDidMount: function componentDidMount() {
		jQuery(this.getDOMNode()).on('promptIcon.visual', (function (event, a) {
			this.refs.promptIcon.open(a);
		}).bind(this));
	},
	componentWillUnmount: function componentWillUnmount() {
		jQuery(this.getDOMNode()).off('visual');
	},
	render: function render() {
		return React.createElement(
			'div',
			null,
			this.props.children,
			React.createElement(PromptIcon, { ref: 'promptIcon' })
		);
	}
});

module.exports = Prompts;

},{"./PromptIcon":92}],94:[function(require,module,exports){
'use strict';

module.exports = {
    montserrat: {
        title: 'Montserrat',
        url: 'Montserrat:400,700',
        family: 'Montserrat, sans-serif'
    },
    lato: {
        title: 'Lato',
        url: 'Lato:300,400,700,300italic,400italic,700italic',
        family: 'Lato, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    raleway: {
        title: 'Raleway',
        url: 'Raleway:300,300italic,400,400italic,700,700italic',
        family: 'Raleway, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    questrial: {
        title: 'Questrial',
        url: 'Questrial',
        family: 'Questrial, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    source_sans_pro: {
        title: 'Source Sans Pro',
        url: 'Source+Sans+Pro:300,300italic,400,400italic,700,700italic',
        family: 'Source Sans Pro, sans-serif'
    },
    roboto_slab: {
        title: 'Roboto Slab',
        url: 'Roboto+Slab:300,300italic,400,400italic,700,700italic',
        family: 'Roboto Slab, serif'
    },
    lora: {
        title: 'Lora',
        url: 'Lora:400,400italic,700,700italic',
        family: 'Lora, Georgia, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    arimo: {
        title: 'Arimo',
        url: 'Arimo:400,400italic,700,700italic',
        family: 'Arimo, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    playfair_display: {
        title: 'Playfair Display',
        url: 'Playfair+Display:400,700,400italic,700italic',
        family: 'Playfair Display, serif'
    },
    quattrocento_sans: {
        title: 'Quattrocento Sans',
        url: 'Quattrocento+Sans:400,400italic,700,700italic',
        family: 'Quattrocento Sans, sans-serif'
    },
    merriweather: {
        title: 'Merriweather',
        url: 'Merriweather:300,300italic,400,400italic,700,700italic',
        family: 'Merriweather, serif'
    },
    martel: {
        title: 'Martel',
        url: 'Martel:300,400,700',
        family: 'Martel, serif'
    },
    martel_sans: {
        title: 'Martel Sans',
        url: 'Martel+Sans:300,400,700',
        family: 'Martel Sans, sans-serif'
    },
    open_sans: {
        title: 'Open Sans',
        url: 'Open+Sans:300,300italic,400,400italic,700,700italic',
        family: 'Open Sans, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    pt_sans_narrow: {
        title: 'PT Sans Narrow',
        url: 'PT+Sans+Narrow:400,700',
        family: 'PT Sans Narrow, sans-serif'
    },
    hind: {
        title: 'Hind',
        url: 'Hind:300,400,700',
        family: 'Hind, sans-serif'
    },
    eb_garamond: {
        title: 'EB Garamond',
        url: 'EB+Garamond',
        family: 'EB Garamond, serif'
    },
    tinos: {
        title: 'Tinos',
        url: 'Tinos:400,400italic,700,700italic',
        family: 'Tinos, serif'
    },
    great_vibes: {
        title: 'Great Vibes',
        url: 'Great+Vibes',
        family: 'Great Vibes, cursive'
    },
    alex_brush: {
        title: 'Alex Brush',
        url: 'Alex+Brush',
        family: 'Alex Brush, cursive'
    },
    allura: {
        title: 'Allura',
        url: 'Allura',
        family: 'Allura, cursive'
    },
    parisienne: {
        title: 'Parisienne',
        url: 'Parisienne',
        family: 'Parisienne, cursive'
    }
};

},{}],95:[function(require,module,exports){
'use strict';

var _ = (window._);

var _config = {};

module.exports = {
    load: function load(config) {
        _.extend(_config, config);
    },
    get: function get(key) {
        return _config[key];
    }
};

},{}],96:[function(require,module,exports){
'use strict';

var _ = (window._);
var EventEmitter = require('events').EventEmitter;

var WebAPIUtils = require('../../../editor/js/helper/utils/WebAPIUtils');
var Promise = require('promise');

var update = (window.React).addons.update;

var CHANGE_EVENT = 'change';
var _globals = {
	project: {},
	language: {}
};
var Globals = _.extend({}, EventEmitter.prototype, {

	/**
  * @param {string} key Optional
  */
	emitChange: function emitChange(key) {
		this.emit(CHANGE_EVENT);
		if (key) {
			this.emit(CHANGE_EVENT + ':' + key);
		}
	},

	/**
  * Can be called in one of two ways:
  * 1. addChangeListener(callback) to listen to any changes
  * 2. addChangeListener(key, callback) to listen to changes only for `key`
  *
  * @param {string|function} keyOrCallback
  * @param {function} callback Optional if called with one argument
  */
	addChangeListener: function addChangeListener(keyOrCallback, callback) {
		var calledInFirstForm = typeof keyOrCallback === 'function';
		var calledInSecondForm = typeof keyOrCallback === 'string' && typeof callback === 'function';
		if (calledInFirstForm) {
			this.on(CHANGE_EVENT, keyOrCallback);
		} else if (calledInSecondForm) {
			this.on(CHANGE_EVENT + ':' + keyOrCallback, callback);
		} else {
			throw new Error('incorrect arguments for Globals.addChangeListener');
		}
	},

	/**
  * Can be called in one of two ways:
  * 1. removeChangeListener(callback) if the callback was attached all keys
  * 2. removeChangeListener(key, callback) if the callback was attached to a specific keys
  *
  * @param {string|function} keyOrCallback
  * @param {function} callback Optional if called with one argument
  */
	removeChangeListener: function removeChangeListener(keyOrCallback, callback) {
		var calledInFirstForm = typeof keyOrCallback === 'function';
		var calledInSecondForm = typeof keyOrCallback === 'string' && typeof callback === 'function';
		if (calledInFirstForm) {
			this.removeListener(CHANGE_EVENT, keyOrCallback);
		} else if (calledInSecondForm) {
			this.removeListener(CHANGE_EVENT + ':' + keyOrCallback, callback);
		} else {
			throw new Error('incorrect arguments for Globals.removeChangeListener');
		}
	},

	// used for compilation
	__set: function __set(data) {
		_globals = data;
	},

	load: function load() {
		return WebAPIUtils.getGlobals().then(function (r) {
			var parsed = JSON.parse(r) || {};

			if (parsed.project) {
				_globals.project = parsed.project;
			}
			if (parsed.language) {
				_globals.language = parsed.language;
			}

			console.log('Global.load: globals loaded with success', _globals);
		})['catch'](function (e) {
			console.log('Globals.load: failed to load globals', e);
		});
	},

	get: function get(key, type) {
		if (type) {
			return _globals[type][key];
		} else if (_globals.language[key]) {
			return _globals.language[key];
		} else if (_globals.project[key]) {
			return _globals.project[key];
		} else {
			return null;
		}
	},

	set: function set(key, data, type) {
		if (!type) {
			throw new Error('Globals.set need type');
		}

		// optimistic update
		var updateOjb = {};
		updateOjb[type] = {};
		updateOjb[type][key] = { $set: data };
		_globals = update(_globals, updateOjb);
		this.emitChange(key);

		return WebAPIUtils.saveGlobals(_globals)['catch'](function (e) {
			// TODO: somehow revert the data
			console.log('Globals.set: failed to save globals', e);
		});
	}

});

module.exports = Globals;

},{"../../../editor/js/helper/utils/WebAPIUtils":130,"events":"events","promise":"promise"}],97:[function(require,module,exports){
'use strict';

var _ = (window._);
var UIState = require('./UIState');
var update = (window.React).addons.update;

function findById(arr, id) {
    return _.find(arr, function (item) {
        return item.id === id;
    });
}

var KEY = 'notifications';
var Notifications = {

    notificationTypes: {
        success: 0,
        error: 1
    },

    addChangeListener: function addChangeListener(callback) {
        UIState.addChangeListener(KEY, callback);
    },

    removeChangeListener: function removeChangeListener(callback) {
        UIState.removeChangeListener(KEY, callback);
    },

    // TODO: implement cloning
    getNotifications: function getNotifications() {
        return UIState.get(KEY) || [];
    },

    addNotification: function addNotification(data) {
        var notifications = this.getNotifications();
        var id = data.id || _.uniqueId();

        // do not add the same notification if it already exists
        if (findById(notifications, id)) {
            return id;
        }

        var newNotifications = update(notifications, { $push: [{
                id: id,
                type: data.type || this.notificationTypes.success,
                text: data.text || 'Notification without text',
                dismissible: data.dismissible !== undefined ? Boolean(data.dismissible) : true,
                autoDismissAfter: Number(data.autoDismissAfter) || 10000
            }] });
        UIState.set(KEY, newNotifications);

        return id;
    },

    removeNotification: function removeNotification(id) {
        var notifications = this.getNotifications();
        var toBeDeleted = findById(notifications, id);

        if (!toBeDeleted) {
            return;
        }

        var index = notifications.indexOf(toBeDeleted);
        var newNotifications = update(notifications, { $splice: [[index, 1]] });
        UIState.set(KEY, newNotifications);
    }

};

module.exports = Notifications;

},{"./UIState":101}],98:[function(require,module,exports){
'use strict';

var _ = (window._);
var EventEmitter = require('events').EventEmitter;
var WebAPIUtils = require('../../../editor/js/helper/utils/WebAPIUtils');
var update = (window.React).addons.update;

function makePageData(pageData) {
	return _.extend({}, {
		title: '',
		description: '',
		data: '',
		index: false,
		type: Pages.pageTypes.internal,
		url: ''
	}, pageData);
}

var CHANGE_EVENT = 'change';
var _pages = [];
var Pages = _.extend({}, EventEmitter.prototype, {

	pageTypes: {
		external: 0,
		internal: 1,
		anchor: 2
	},

	emitChange: function emitChange() {
		this.emit(CHANGE_EVENT);
	},

	addChangeListener: function addChangeListener(callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function removeChangeListener(callback) {
		this.removeListener(CHANGE_EVENT, callback);
	},

	// used for compilation
	__set: function __set(pages) {
		_pages = pages;
	},

	// TODO: implement cloning
	getPages: function getPages() {
		return _pages;
	},

	// TODO: implement cloning
	getIndexPage: function getIndexPage() {
		var indexPage = _.find(_pages, function (page) {
			return page.index === true;
		});
		return indexPage || null;
	},

	// TODO: implement cloning
	getPageById: function getPageById(pageId) {
		if (pageId === 'index') {
			return this.getIndexPage();
		}

		var page = _.find(_pages, function (page) {
			return page.id === pageId;
		});
		return page || null;
	},

	// TODO: implement cloning
	getPageBySlug: function getPageBySlug(slug) {
		var page = _.find(_pages, function (page) {
			return page.slug === slug;
		});
		return page || null;
	},

	load: function load() {
		return WebAPIUtils.getPages().then(function (pages) {
			return pages.length ? pages : WebAPIUtils.addPage(makePageData({ title: 'Home', index: true })).then(function (indexPage) {
				return [indexPage];
			});
		}).then(function (pages) {
			_pages = pages;
			console.log('Pages.load: pages loaded with success', _pages);
		})['catch'](function (e) {
			console.log('Pages.load: failed to create default page', e);
		});
	},

	addPage: function addPage(data) {
		var page = makePageData(data);

		// update optimistically
		var dirtyPage = _.extend({}, page, { dirty: true });
		_pages = update(_pages, { $push: [dirtyPage] });
		this.emitChange();

		return WebAPIUtils.addPage(page).then((function (r) {
			var index = _pages.indexOf(dirtyPage);
			_pages = update(_pages, { $splice: [[index, 1, r]] });
			this.emitChange();
		}).bind(this))['catch'](function (e) {
			console.log('Pages.addPage: failed to add page', e);
		});
	},

	updatePage: function updatePage(id, data) {
		var updatedPage = _.find(_pages, function (page) {
			return page.id === id;
		});
		var indexPage = _.find(_pages, function (page) {
			return page.index;
		});
		var dirtyPage = _.extend({}, updatedPage, data, { dirty: true });

		// update optimistically
		updatePage();
		if (data.index && indexPage !== updatedPage) {
			unmarkOldIndexPage();
		}
		this.emitChange();

		var updateData = _.extend({}, updatedPage, data);
		return WebAPIUtils.updatePage(id, updateData).then((function (r) {
			// replace the dirty page with the clean one
			_pages = update(_pages, { $splice: [[findIndex('dirty'), 1, r]] });
			this.emitChange();
		}).bind(this))['catch'](function (e) {
			console.log('Pages.updatePage: update pages error', e);
		});

		function findIndex(whose) {
			var pages = {
				updated: updatedPage,
				index: indexPage,
				dirty: dirtyPage
			};
			return _pages.indexOf(pages[whose]);
		}

		function updatePage() {
			_pages = update(_pages, { $splice: [[findIndex('updated'), 1, dirtyPage]] });
		}

		function unmarkOldIndexPage() {
			var updateObj = {};
			updateObj[findIndex('index')] = { index: { $set: false } };

			_pages = update(_pages, updateObj);
		}
	},

	deletePage: function deletePage(id) {
		var deletedPage = _.find(_pages, function (page) {
			return page.id === id;
		});

		if (!deletedPage) {
			return;
		}

		// delete optimistically
		var index = _pages.indexOf(deletedPage);
		_pages = update(_pages, { $splice: [[index, 1]] });
		this.emitChange();

		return WebAPIUtils.deletePage(id)['catch'](function (e) {
			console.log('Pages.deletePage: delete pages error', e);
		});
	}

});
Pages.setMaxListeners(Infinity);

module.exports = Pages;

},{"../../../editor/js/helper/utils/WebAPIUtils":130,"events":"events"}],99:[function(require,module,exports){
'use strict';

var _ = (window._);
var WebAPIUtils = require('../../../editor/js/helper/utils/WebAPIUtils');

var projectLanguages = [];

module.exports = {

    getAll: function getAll() {
        return projectLanguages;
    },

    getDefault: function getDefault() {
        return _.findWhere(projectLanguages, { is_default: true });
    },

    load: function load() {
        return WebAPIUtils.getProjectLanguages().then(function (languages) {
            console.log('ProjectLanguages load', languages);

            projectLanguages = languages;
        })['catch'](function (e) {
            console.log('Languages.load: failed to load', e);
        });
    }
};

},{"../../../editor/js/helper/utils/WebAPIUtils":130}],100:[function(require,module,exports){
'use strict';

var _ = (window._);
var EventEmitter = require('events').EventEmitter;

var Visual = require('../Visual');
var Pages = require('./Pages');

function makePageHref(page) {
	if (page.type === Pages.pageTypes.internal) {
		return Visual.renderMethod === 'renderForEdit' ? '#/page/' + page.slug : '/' + page.slug;
	} else if (page.type === Pages.pageTypes.external || page.type === Pages.pageTypes.anchor) {
		return page.url;
	} else {
		throw 'Unknown page type';
	}
}

var router;
try {
	router = {
		location: window.location,
		options: {
			regex: '',
			handler: function handler() {},
			notfound: function notfound() {}
		},
		onhashchange: function onhashchange() {
			var hash = this.location.hash;
			var matches = this.options.regex.exec(hash);
			if (matches) {
				this.options.handler.apply(this, matches.slice(1));
			} else {
				this.options.notfound();
			}
		},
		listen: function listen() {
			window.onhashchange = this.onhashchange.bind(this);
		},
		stopListening: function stopListening() {
			window.onhashchange = null;
		},
		setRoute: function setRoute(route) {
			location.hash = route;
		},
		init: function init(options) {
			this.options.regex = options.regex || this.options.regex;
			this.options.handler = options.handler || this.options.handler;
			this.options.notfound = options.notfound || this.options.notfound;

			this.onhashchange();
			this.listen();
		}
	};
} catch (e) {
	router = {
		location: null,
		options: null,
		onhashchange: _.noop,
		listen: _.noop,
		stopListening: _.noop,
		setRoute: _.noop,
		init: _.noop
	};
}

var CHANGE_EVENT = 'change';
var lastRoute;
var activePageId;
var Router = _.extend({}, EventEmitter.prototype, {

	emitChange: function emitChange() {
		this.emit.apply(this, [CHANGE_EVENT].concat(Array.prototype.slice.call(arguments, 0)));
	},

	addChangeListener: function addChangeListener(callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function removeChangeListener(callback) {
		this.removeListener(CHANGE_EVENT, callback);
	},

	getPageUrl: function getPageUrl(pageId) {
		var page = Pages.getPageById(pageId);
		return page && makePageHref(page);
	},

	getActivePageId: function getActivePageId() {
		return activePageId;
	},

	setActivePageId: function setActivePageId(pageId) {
		// TODO: add verifications if valid page
		activePageId = pageId;
	},

	goBack: function goBack() {
		var tmp = lastRoute;
		router.stopListening();
		router.setRoute(lastRoute);
		setTimeout(function () {
			router.listen();
			lastRoute = tmp;
		}, 0);
	},

	goToIndex: function goToIndex() {
		var indexPage = Pages.getIndexPage();
		router.setRoute('/page/' + indexPage.slug);
	},

	goToPage: function goToPage(pageId) {
		var page = Pages.getPageById(pageId);
		if (page) {
			router.setRoute('/page/' + page.slug);
		}
	},

	init: function init() {
		router.init({
			regex: /\/page\/([\w-]*)/,
			handler: (function (slug) {
				this.emitChange(slug);
				lastRoute = '/page/' + slug;
				var activePage = Pages.getPageBySlug(slug);
				if (activePage && activePage.id) {
					this.setActivePageId(activePage.id);
				}
			}).bind(this),
			notfound: function notfound() {
				var indexPage = Pages.getIndexPage();
				router.setRoute('/page/' + indexPage.slug);
			}
		});
	}

});

module.exports = Router;

},{"../Visual":3,"./Pages":98,"events":"events"}],101:[function(require,module,exports){
'use strict';

var _ = (window._);
var EventEmitter = require('events').EventEmitter;

function checkArgs(key, callback) {
    if (typeof key !== 'string' || typeof callback !== 'function') {
        throw new Error('incorrect argument types for UIState.addChangeListener');
    }
}

var _state = {};

var UIState = _.extend({}, EventEmitter.prototype, {

    /**
     * @param {string} key
     */
    emitChange: function emitChange(key, data) {
        this.emit(key, data);
    },

    /**
     * @param {string} key
     * @param {function} callback
     */
    addChangeListener: function addChangeListener(key, callback) {
        checkArgs(key, callback);
        this.on(key, callback);
    },

    /**
     * @param {string} key
     * @param {function} callback
     */
    removeChangeListener: function removeChangeListener(key, callback) {
        checkArgs(key, callback);
        this.removeListener(key, callback);
    },

    get: function get(key) {
        return _state[key];
    },

    set: function set(key, value) {
        _state[key] = value;
        this.emitChange(key, value);
    }

});

module.exports = UIState;

},{"events":"events"}],102:[function(require,module,exports){
'use strict';

var _ = (window._);

/**
 * Definition
 *
 * @param parent
 * @param {...Object} override
 * @constructor
 */
function Definition(parent, override) {
    _.extend(this, override);
    this._parent = parent;
}

Definition.prototype.extend = function (override) {
    return new Definition(this, _.extend({}, this, override));
};

module.exports = Definition;

},{}],103:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React);

var MouseFollower = React.createClass({
    displayName: 'MouseFollower',

    getDefaultProps: function getDefaultProps() {
        return {
            sx: 0, // style dx
            sy: 0, // style dy
            px: 0, // pointer dx
            py: 0, // pointer dy
            shiftX: 0, // deprecated
            shiftY: 0, // deprecated
            dx: 0, // deprecated
            dy: 0, // deprecated
            style: {},
            onMouseMove: function onMouseMove(follower, event) {
                var x = event.clientX + (follower.props.dx || follower.props.sx || follower.props.shiftX),
                    y = event.clientY + (follower.props.dy || follower.props.sy || follower.props.shiftY);
                follower.setState({ style: { left: x, top: y } });
                follower.props.onPointer(x + follower.props.px, y + follower.props.py);
            },
            onMouseUp: function onMouseUp(follower, event) {},
            onPointer: function onPointer(x, y) {}
        };
    },
    getInitialState: function getInitialState() {
        return {
            style: {}
        };
    },
    componentDidMount: function componentDidMount() {
        // console.log('MouseFollower.componentDidMount');
        this.attach(true);
    },
    componentWillUnmount: function componentWillUnmount() {
        // console.log('MouseFollower.componentWillUnmount');
        this.attach(false);
    },
    render: function render() {
        if (this.props.children) {
            return React.addons.cloneWithProps(this.props.children, { style: _.extend({}, this.props.style, this.state.style) });
        }
        return null;
    },
    handleMouseMove: function handleMouseMove(event) {
        return this.props.onMouseMove(this, event);
    },
    handleMouseUp: function handleMouseUp(event) {
        return this.props.onMouseUp(this, event);
    },
    attach: function attach(_attach) {
        // mousemove, and mouseup handlers should be the same for both .on and .off methods
        var map = { mousemove: this.handleMouseMove, mouseup: this.handleMouseUp };
        if (_attach) {
            jQuery(document).on(map);
        } else {
            jQuery(document).off(map);
        }
    }
});

module.exports = MouseFollower;

},{}],104:[function(require,module,exports){
"use strict";

function arrayInsertion(array, selection) {
    var index,
        insertion = [];

    /*
        assert(array instanceof Array, 'arrayInsertion: array should be of type Array');
        assert(selection instanceof Array, 'arrayInsertion: selection should be of type Array');
    */

    for (index = 0; index < selection.length; ++index) {
        insertion.push(array[selection[index]]);
    }

    return insertion;
}

module.exports = arrayInsertion;

},{}],105:[function(require,module,exports){
"use strict";

function arrayMove(array, selection, insertion, insertionPoint) {
    var index,
        result = [];

    /*
        assert(array instanceof Array, 'arrayMove: array should be of type Array');
        assert(selection instanceof Array, 'arrayMove: selection should be of type Array');
        assert(insertion instanceof Array, 'arrayMove: insertion should be of type Array');
        assert(/\d+/.test(insertionPoint), 'arrayMove: insertionPoint should be a number');
        assert(insertionPoint >= 0 && insertionPoint <= array.length, 'arrayMove: insertionPoint should be inside of the *array*');
    */

    for (index = 0; index < array.length; ++index) {
        if (selection.indexOf(index) === -1) {
            result.push(array[index]);
        }
    }

    for (index = 0; index < insertion.length; ++index) {
        result.splice(insertionPoint + index, 0, insertion[index]);
    }

    return result;
}

module.exports = arrayMove;

},{}],106:[function(require,module,exports){
'use strict';

function arrayPreview(array, selection, insertion, insertionPoint) {
    var ref,
        index,
        inserted = false,
        itemIndex,
        insIndex,
        selIndex = 0,
        preview = [];

    selection = selection || [];
    insertion = insertion || [];

    /*
        assert(array instanceof Array, 'arrayPreview: array should be of type Array');
        assert(selection instanceof Array, 'arrayPreview: selection should be of type Array');
        assert(insertion instanceof Array, 'arrayPreview: insertion should be of type Array');
        assert(/\d+/.test(insertionPoint), 'arrayPreview: insertionPoint should be a number');
        assert(insertionPoint >= 0 && insertionPoint <= array.length, 'arrayPreview: insertionPoint should be inside of the *array*');
    */

    for (index = 0, itemIndex = 0; index < array.length; ++index) {
        if (selection.indexOf(index) === -1) {
            if (itemIndex == insertionPoint) {
                for (insIndex = 0; insIndex < insertion.length; ++insIndex) {
                    ref = 'ins' + insIndex;
                    preview.push({ type: 'insertion', ref: ref, key: ref, value: insertion[insIndex] });
                }
                inserted = true;
            }
            preview.push({ type: 'item', ref: itemIndex, key: itemIndex, index: itemIndex, value: array[index] });
            ++itemIndex;
        } else {
            ref = 'sel' + selIndex++;
            preview.push({ type: 'selection', ref: ref, key: ref, value: array[index] });
        }
    }

    if (!inserted) {
        for (insIndex = 0; insIndex < insertion.length; ++insIndex) {
            ref = 'ins' + insIndex;
            preview.push({ type: 'insertion', ref: ref, key: ref, value: insertion[insIndex] });
        }
    }

    return preview;
}

module.exports = arrayPreview;

},{}],107:[function(require,module,exports){
// Binary Fuzzy Search https://github.com/vbarbarosh/js_algo_1d_nearest
"use strict";

function bsearchz(array, fn_distance) {
    var i,
        result = [],
        indices = bsearchzi(array, fn_distance);

    for (i = 0; i < indices.length; ++i) {
        result.push(array[indices[i]]);
    }

    return result;
}

function bsearchzi(array, fn_distance) {
    var min = Number.MAX_VALUE,
        minIndex,
        begin = 0,
        end = array.length,
        mid,
        result = [],
        distance_tmp;

    while (begin < end) {
        mid = begin + end >> 1;
        distance_tmp = fn_distance(array[mid]);
        if (distance_tmp < 0) {
            begin = mid + 1;
        } else {
            end = mid;
        }
        distance_tmp = Math.abs(distance_tmp);
        if (min > distance_tmp) {
            min = distance_tmp;
            minIndex = mid;
        }
        if (min == 0) {
            break;
        }
    }

    while (minIndex > 0 && Math.abs(fn_distance(array[minIndex - 1])) == min) {
        --minIndex;
    }

    while (minIndex < array.length && Math.abs(fn_distance(array[minIndex])) == min) {
        result.push(minIndex);
        ++minIndex;
    }

    return result;
}

module.exports = bsearchz;

},{}],108:[function(require,module,exports){
'use strict';

function distance(x1, y1, x2, y2) {
    var dx = x2 - x1,
        dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

module.exports = distance;

},{}],109:[function(require,module,exports){
'use strict';

var offsetParent = require('./offsetParent');

function getBoundingDocumentRect(elem) {
    var p,
        r = elem.getBoundingClientRect(),
        left = 0,
        top = 0;

    for (p = elem; p !== document.documentElement; p = offsetParent(p)) {
        left += p.offsetLeft;
        top += p.offsetTop;
    }

    return { left: left, top: top, right: left + (r.right - r.left), bottom: top + (r.bottom - r.top) };
}

module.exports = getBoundingDocumentRect;

},{"./offsetParent":111}],110:[function(require,module,exports){
'use strict';

function getScrollOffset(elem) {
    var p,
        left = 0,
        top = 0,
        style;

    for (p = elem; p !== null; p = p.parentElement) {
        left += p.scrollLeft;
        top += p.scrollTop;
        style = getComputedStyle(p);
        if (style.position == 'fixed') {
            left -= parseInt(style.left);
            top -= parseInt(style.top);
            break;
        }
    }

    return { left: left, top: top };
}

module.exports = getScrollOffset;

},{}],111:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

function offsetParent(elem) {
    return jQuery(elem).offsetParent().get(0);
}

module.exports = offsetParent;

},{}],112:[function(require,module,exports){
'use strict';

var _ = (window._),
    jQuery = (window.jQuery),
    getBoundingDocumentRect = require('../dom/getBoundingDocumentRect'),
    getScrollOffset = require('../dom/getScrollOffset'),
    bsearchz = require('../bsearchz');

// This methods works well with one-dimensional top-down lists
function ListInsertionPointFinder(sortable, preview) {
    var refs = sortable.refs,
        last = { insertionPoint: 0, clientY: 0 },
        point = [],
        hidden = [],
        scrollbarKeeper = jQuery('<div style="height: 1000px; width: 0;" />');

    jQuery(sortable.getDOMNode()).append(scrollbarKeeper);

    // temporary hide any non *item* elements
    _.each(preview, function (item) {
        var dom;
        if (item.type != 'item' && refs[item.ref]) {
            dom = refs[item.ref].getDOMNode();
            hidden.push({ dom: dom, display: dom.style.display || '' });
            dom.style.display = 'none';
        }
    });

    // create an array of points to search in
    _.each(preview, function (item) {
        var dom, rect;
        if (item.type == 'item') {
            dom = refs[item.ref].getDOMNode();
            rect = getBoundingDocumentRect(dom);
            point.push({ insertionPoint: item.index, clientY: rect.top });
            last = { insertionPoint: item.index + 1, clientY: rect.bottom };
        }
    });
    point.push(last);

    // restore hidden items
    _.each(hidden, function (rec) {
        rec.dom.style.display = rec.display;
    });

    scrollbarKeeper.remove();

    // sort them to make search faster
    this.point = _.sortBy(point, _.property('clientY'));
    this.sortable = sortable;
}

// find a point most closest to the cursor
ListInsertionPointFinder.prototype.find = function (clientX, clientY) {
    var scroll = getScrollOffset(this.sortable.getDOMNode()),
        x = clientX + scroll.left,
        y = clientY + scroll.top;
    return _.first(bsearchz(this.point, function (it) {
        return it.clientY - y;
    })).insertionPoint;
};

module.exports = ListInsertionPointFinder;

},{"../bsearchz":107,"../dom/getBoundingDocumentRect":109,"../dom/getScrollOffset":110}],113:[function(require,module,exports){
'use strict';

var _ = (window._),
    treeDepth = require('../treeDepth'),
    treeWalkPreOrder = require('../treeWalkPreOrder'),
    getBoundingDocumentRect = require('../dom/getBoundingDocumentRect'),
    getScrollOffset = require('../dom/getScrollOffset'),
    bsearchz = require('../bsearchz'),
    treeInsertionPointShift = require('../treeInsertionPointShift');

function TreeDepthLimitInsertionPointFinder(maxDepth, sortable, preview) {
    var refs = sortable.refs,
        last = { insertionPoint: [-1], clientY: 0 },
        point = [],
        hidden = [],
        insertionDepth = treeDepth(sortable.getInsertion());

    // temporary hide any non *item* elements
    treeWalkPreOrder(preview, function (item) {
        var dom;
        if (item.type != 'item' && refs[item.ref]) {
            dom = refs[item.ref].getDOMNode();
            hidden.push({ dom: dom, display: dom.style.display || '' });
            dom.style.display = 'none';
        }
    });

    // create an array of points to search in
    treeWalkPreOrder(preview, function (node, path, index, parent) {
        var dom, rect;
        if (node.type == 'item') {
            dom = refs[node.ref].getDOMNode();
            rect = getBoundingDocumentRect(dom);
            // exclude nodes not suitable for insertion (after insertion
            // node depth will become more than allowed)
            if (node.path.length + insertionDepth <= maxDepth) {
                point.push({ insertionPoint: node.path, clientX: rect.left, clientY: rect.top });
                last = { insertionPoint: node.path, clientX: rect.left, clientY: rect.bottom };
            }
        }
    });
    last.insertionPoint = last.insertionPoint.slice(0);
    last.insertionPoint[last.insertionPoint.length - 1]++;
    point.push(last);

    // restore hidden items
    _.each(hidden, function (rec) {
        rec.dom.style.display = rec.display;
    });

    // sort them to make search faster
    this.point = _.sortBy(point, _.property('clientY'));
    this.items = extractItems(preview);
    this.sortable = sortable;
    this.maxDepth = maxDepth;

    function extractItems(root) {
        var children = _.filter(root.children, function (node) {
            return node.type == 'item';
        });
        return _.extend({}, root, { children: _.map(children, extractItems) });
    }
}

// find a point most closest to the cursor
TreeDepthLimitInsertionPointFinder.prototype.find = function (clientX, clientY) {
    var scroll = getScrollOffset(this.sortable.getDOMNode()),
        x = scroll.left + clientX,
        y = scroll.top + clientY,
        nearest = _.first(bsearchz(this.point, function (it) {
        return it.clientY - y;
    })),
        insertionDepth = treeDepth(this.sortable.getInsertion()),
        insertionPointDepth = nearest.insertionPoint.length,
        maxAllowedShift = this.maxDepth - insertionDepth - insertionPointDepth,
        shift = Math.min(maxAllowedShift, Math.round((x - nearest.clientX) / 25));
    return treeInsertionPointShift(this.items, nearest.insertionPoint, shift);
};

module.exports = TreeDepthLimitInsertionPointFinder;

},{"../bsearchz":107,"../dom/getBoundingDocumentRect":109,"../dom/getScrollOffset":110,"../treeDepth":117,"../treeInsertionPointShift":120,"../treeWalkPreOrder":124}],114:[function(require,module,exports){
'use strict';

var _ = (window._),
    treeWalkPreOrder = require('../treeWalkPreOrder'),
    getBoundingDocumentRect = require('../dom/getBoundingDocumentRect'),
    getScrollOffset = require('../dom/getScrollOffset'),
    bsearchz = require('../bsearchz'),
    treeInsertionPointShift = require('../treeInsertionPointShift');

function TreeInsertionPointFinder(sortable, preview) {
    var refs = sortable.refs,
        last = { insertionPoint: [-1], clientY: 0 },
        point = [],
        hidden = [];

    // temporary hide any non *item* elements
    treeWalkPreOrder(preview, function (item) {
        var dom;
        if (item.type != 'item' && refs[item.ref]) {
            dom = refs[item.ref].getDOMNode();
            hidden.push({ dom: dom, display: dom.style.display || '' });
            dom.style.display = 'none';
        }
    });

    // create an array of points to search in
    treeWalkPreOrder(preview, function (node, path, index, parent) {
        var dom, rect;
        if (node.type == 'item') {
            dom = refs[node.ref].getDOMNode();
            rect = getBoundingDocumentRect(dom);
            point.push({ insertionPoint: node.path, clientX: rect.left, clientY: rect.top });
            last = { insertionPoint: node.path, clientX: rect.left, clientY: rect.bottom };
        }
    });
    last.insertionPoint = last.insertionPoint.slice(0);
    last.insertionPoint[last.insertionPoint.length - 1]++;
    point.push(last);

    // restore hidden items
    _.each(hidden, function (rec) {
        rec.dom.style.display = rec.display;
    });

    // sort them to make search faster
    this.point = _.sortBy(point, _.property('clientY'));
    this.items = extractItems(preview);
    this.sortable = sortable;

    function extractItems(root) {
        var children = _.filter(root.children, function (node) {
            return node.type == 'item';
        });
        return _.extend({}, root, { children: _.map(children, extractItems) });
    }
}

// find a point most closest to the cursor
TreeInsertionPointFinder.prototype.find = function (clientX, clientY) {
    var scroll = getScrollOffset(this.sortable.getDOMNode()),
        x = scroll.left + clientX,
        y = scroll.top + clientY,
        nearest = _.first(bsearchz(this.point, function (it) {
        return it.clientY - y;
    })),
        shift = Math.round((x - nearest.clientX) / 25);
    return treeInsertionPointShift(this.items, nearest.insertionPoint, shift);
};

module.exports = TreeInsertionPointFinder;

},{"../bsearchz":107,"../dom/getBoundingDocumentRect":109,"../dom/getScrollOffset":110,"../treeInsertionPointShift":120,"../treeWalkPreOrder":124}],115:[function(require,module,exports){
'use strict';

var _ = (window._),
    getBoundingDocumentRect = require('../dom/getBoundingDocumentRect'),
    getScrollOffset = require('../dom/getScrollOffset'),
    distance = require('../distance'),
    lsearchz = require('../lsearchz');

function GridItemFinder(container, refs) {
    var point = [];

    // create an array of points to search in
    _.each(refs, function (ref) {
        var dom = container.refs[ref].getDOMNode(),
            rect = getBoundingDocumentRect(dom);
        point.push({ x: rect.left, y: rect.top, ret: { ref: ref, before: true, after: false } });
        point.push({ x: rect.right, y: rect.top, ret: { ref: ref, before: false, after: true } });
    });

    // sort them to make search faster
    // this.point = _.sortBy(point, function (it) { return distance(0, 0, it.x, it.y); });
    this.point = point;
    this.container = container;
}

// find a point most closest to the cursor
GridItemFinder.prototype.find = function (clientX, clientY) {
    var scroll = getScrollOffset(this.container.getDOMNode()),
        x = clientX + scroll.left,
        y = clientY + scroll.top;
    return _.first(lsearchz(this.point, function (it) {
        return distance(x, y, it.x, it.y);
    })).ret;
};

module.exports = GridItemFinder;

},{"../distance":108,"../dom/getBoundingDocumentRect":109,"../dom/getScrollOffset":110,"../lsearchz":116}],116:[function(require,module,exports){
'use strict';

// Linear Fuzzy Search https://github.com/vbarbarosh/js_algo_1d_nearest
function lsearchz(array, fn_distance) {
    var i,
        result = [],
        indices = lsearchzi(array, fn_distance);

    for (i = 0; i < indices.length; ++i) {
        result.push(array[indices[i]]);
    }

    return result;
}

function lsearchzi(array, fn_distance) {
    var tmp,
        min = Number.MAX_VALUE,
        minIndex,
        index,
        result = [],
        total = 0;

    if (array.length == 0) {
        return [];
    }

    // 1. Find the nearest possible value (at the same count how many times it occurs)
    for (index = 0; index < array.length; ++index) {
        tmp = Math.abs(fn_distance(array[index]));
        if (min > tmp) {
            min = tmp;
            minIndex = index;
            total = 1;
        } else if (min == tmp) {
            ++total;
        }
    }

    // 2. Return that number that many time it occurs.
    for (index = 0; index < total; ++index) {
        result.push(minIndex);
    }

    return result;
}

module.exports = lsearchz;

},{}],117:[function(require,module,exports){
'use strict';

var treeWalkPreOrder = require('./treeWalkPreOrder');

function treeDepth(root) {
    var depth = 0;

    treeWalkPreOrder(root, function (node, path, index) {
        if (depth < path.length) {
            depth = path.length;
        }
    });

    return depth;
}

module.exports = treeDepth;

},{"./treeWalkPreOrder":124}],118:[function(require,module,exports){
"use strict";

function treeFind(root, path) {
    var index,
        node = root;

    /*
        assert(_.has(tree, 'children'), 'treeFind: *root* should contain a *children* property');
        assert(path instanceof Array, 'treeFind: *path* should be of type Array');
    */

    for (index = 0; index < path.length; ++index) {
        node = node.children[path[index]];
    }

    return node;
}

module.exports = treeFind;

},{}],119:[function(require,module,exports){
'use strict';

var treeFind = require('./treeFind');

function treeInsertion(root, selection) {
    return treeFind(root, selection);
}

module.exports = treeInsertion;

},{"./treeFind":118}],120:[function(require,module,exports){
'use strict';

var treeFind = require('./treeFind');

function treeInsertionPointShift(root, insertionPoint, distance) {
    var result = insertionPoint.slice(),
        node;

    // Increase level
    //
    // Increasing level of a node means move that node after very
    // last children of its previous sibling.
    //
    // Each element can increase its level only if it is not a
    // first child.
    for (; distance > 0; --distance) {
        if (result[result.length - 1] == 0) {
            break;
        }
        result[result.length - 1] -= 1;
        node = treeFind(root, result);
        result.push(node.children.length);
    }

    // Decrease level
    //
    // Decreasing level of a node means move that node after its
    // parent.
    //
    // Each element can increase its level only if it is a last
    // child.
    for (; result.length > 1 && distance < 0; ++distance) {
        node = treeFind(root, result.slice(0, -1));
        if (result[result.length - 1] < node.children.length) {
            break;
        }
        result.pop();
        result[result.length - 1] += 1;
    }

    return result;
}

module.exports = treeInsertionPointShift;

},{"./treeFind":118}],121:[function(require,module,exports){
'use strict';

var _ = (window._);

function treeMap(root, cb) {
    function map(root, rootPath, rootIndex) {
        return _.extend(cb(root, rootPath, rootIndex), {
            children: _.map(root.children, function (node, nodeIndex) {
                return map(node, rootPath.concat(nodeIndex), nodeIndex);
            })
        });
    }

    return map(root, [], 0);
}

module.exports = treeMap;

},{}],122:[function(require,module,exports){
'use strict';

var treeFind = require('./treeFind');

function treeMove(root, selection, insertion, insertionPoint) {
    var result = JSON.parse(JSON.stringify(root)),
        node;

    if (selection) {
        node = treeFind(result, selection.slice(0, -1));
        node.children.splice(selection[selection.length - 1], 1);
    }

    if (insertion) {
        node = treeFind(result, insertionPoint.slice(0, -1));
        node.children.splice(insertionPoint[insertionPoint.length - 1], 0, insertion);
    }

    return result;
}

module.exports = treeMove;

},{"./treeFind":118}],123:[function(require,module,exports){
'use strict';

var _ = (window._),
    treeFind = require('./treeFind'),
    treeMap = require('./treeMap');

function treePreview(root, selection, insertion, insertionPoint) {
    var result = JSON.parse(JSON.stringify(root)),
        node,
        insIndex = 0,
        tmpSelection,
        tmpInsertion;

    // cut out selection
    if (selection) {
        node = treeFind(result, selection.slice(0, -1));
        tmpSelection = node.children.splice(selection[selection.length - 1], 1)[0];
    }

    // wrap each item
    result = treeMap(result, function (node, path, index) {
        return { type: 'item', ref: path.join('/'), key: index, path: path, value: _.omit(node, 'children') };
    });

    /*
        // selection
        if (selection) {
            tmpSelection = treeMap(tmpSelection, function (node, nodePath, nodeIndex) {
                return {type: 'selection', value: _.omit(node, 'children')};
            });
            node = treeFind(result, selection.slice(0, -1));
            node.children.splice(selection[selection.length - 1], 0, tmpSelection);
        }
    */

    // add insertion, if any
    if (insertion) {
        tmpInsertion = treeMap(insertion, function (node, path, index) {
            var ref = 'ins',
                key = 'ins';
            if (path.length > 0) {
                ref = null;
                key = index;
            }
            return { type: 'insertion', ref: ref, key: key, value: _.omit(node, 'children') };
        });
        node = treeFind(result, insertionPoint.slice(0, -1));
        node.children.splice(insertionPoint[insertionPoint.length - 1], 0, tmpInsertion);
    }

    return result;
}

module.exports = treePreview;

},{"./treeFind":118,"./treeMap":121}],124:[function(require,module,exports){
'use strict';

var _ = (window._);

function treeWalkPreOrder(root, cb) {
    function walk(root, rootPath, rootIndex, _cb, parent) {
        _cb(root, rootPath, rootIndex, parent);
        _.each(root.children, function (child, childIndex) {
            walk(child, rootPath.concat(childIndex), childIndex, cb, root);
        });
    }

    walk(root, [], 0, function () {});
}

function treeWalkPreOrderRoot(root, cb) {
    function walk(root, rootPath, rootIndex, parent) {
        cb(root, rootPath, rootIndex, parent);
        _.each(root.children, function (child, childIndex) {
            walk(child, rootPath.concat(childIndex), childIndex, root);
        });
    }

    walk(root, [], 0);
}

module.exports = treeWalkPreOrder;

},{}],125:[function(require,module,exports){
'use strict';

function kv(key, value) {
    var tmp = {};
    tmp[key] = value;
    return tmp;
}

module.exports = kv;

},{}],126:[function(require,module,exports){
'use strict';

var _ = (window._);
var Pages = require('../../../../editor/js/global/Pages');
var Globals = require('../../../../editor/js/global/Globals');
var Config = require('../../../../editor/js/global/Config');

function getDefaultMenus() {
	var configMenus = Config.get('menus'),
	    menuDefaults = {
		multiLevel: true
	};

	if (invalidMenus(configMenus)) {
		throw new Error('No or invalid menus specified in the config');
	} else {
		return _.map(configMenus, correctMenu);
	}

	function invalidMenus(menus) {
		return !_.isArray(menus) || _.some(menus, function (menu) {
			return !menu.id || !menu.title;
		});
	}

	function correctMenu(menu) {
		return _.extend({}, menuDefaults, menu, { children: [] });
	}
}

function getMenus() {
	var menus = Globals.get('menus');
	return menus && _.isArray(menus) ? _.map(menus, fixMenu) : getDefaultMenus();

	function fixMenu(menu) {
		menu.children = fixChildren(menu.children);
		return menu;
	}

	function fixChildren(children) {
		if (!children || !children.length) {
			return [];
		}

		var filtered = _.filter(children, pointsToValidPage);
		return _.map(filtered, fixMenu);
	}

	function pointsToValidPage(menuItem) {
		if (!pointsToValidPage.memo) {
			pointsToValidPage.memo = _.reduce(Pages.getPages(), function (memo, page) {
				memo[page.id] = true;
				return memo;
			}, {});
		}

		return Boolean(pointsToValidPage.memo[menuItem.pageId]);
	}
}

function getMenu(menuId) {
	var menu = _.find(getMenus(), function (menu) {
		return menu.id === menuId;
	});

	return menu || null;
}

module.exports = {
	getMenus: getMenus,
	getMenu: getMenu
};

},{"../../../../editor/js/global/Config":95,"../../../../editor/js/global/Globals":96,"../../../../editor/js/global/Pages":98}],127:[function(require,module,exports){
'use strict';

var Visual = require('../../../../editor/js/Visual');

function createChainedFunction(funcs) {
	return funcs.filter(function (f) {
		return f != null;
	}).reduce(function (acc, f) {
		if (typeof f !== 'function') {
			throw new Error('Invalid Argument Type, must only provide functions, undefined, or null.');
		}

		if (acc === null) {
			return f;
		}

		return function chainedFunction() {
			var args = Array.prototype.slice.call(arguments);
			acc.apply(this, args);
			f.apply(this, args);
		};
	}, null);
}

function randomStringFragment() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
function decimalAdjust(type, value, exp) {
	// If the exp is undefined or zero...
	if (typeof exp === 'undefined' || +exp === 0) {
		return Math[type](value);
	}
	value = +value;
	exp = +exp;
	// If the value is not a number or the exp is not an integer...
	if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
		return NaN;
	}
	// Shift
	value = value.toString().split('e');
	value = Math[type](+(value[0] + 'e' + (value[1] ? +value[1] - exp : -exp)));
	// Shift back
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? +value[1] + exp : exp));
}

function isEditorMode() {
	return Visual.renderMethod === 'renderForEdit';
}

function isPreviewMode() {
	return Visual.renderMethod === 'renderForView';
}

module.exports = {

	createChainedFunction: createChainedFunction,

	/**
  * Returns a four character random string
  *
  * @return {string}
  */
	randomStringFragment: randomStringFragment,

	/**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
  *
  * @return {number}
  */
	decimalAdjust: decimalAdjust,

	isEditorMode: isEditorMode,

	isPreviewMode: isPreviewMode
};

},{"../../../../editor/js/Visual":3}],128:[function(require,module,exports){
'use strict';

var Config = require('../../global/Config');

module.exports = {

    isMultiPage: function isMultiPage() {
        return Boolean(Config.get('allowMultiPage'));
    }

};

},{"../../global/Config":95}],129:[function(require,module,exports){
'use strict';

var _ = (window._);
var Router = require('../../../../editor/js/global/Router');
var Pages = require('../../../../editor/js/global/Pages');

function extractPageId(url) {

    // checking if the input is in the form of 'page:${pageID}'
    var match = /^page:([\w-]*)$/.exec(url);
    return match ? match[1] : url;
}

function getPageUrl(url) {
    return Router.getPageUrl(extractPageId(url));
}

function isInternalPage(url) {
    var id = extractPageId(url);
    var page = Pages.getPageById(id);
    return page && page.type === Pages.pageTypes.internal;
}

function url(url) {
    return getPageUrl(url) || url;
}

function getVideoUrl(data, urlType) {
    var src;
    if (data.type == 'youtube') {
        src = urlType && urlType == 'url' ? "https://www.youtube.com/watch?v=" : "https://www.youtube.com/embed/";
    } else if (data.type == 'vimeo') {
        src = urlType && urlType == 'url' ? "https://vimeo.com/" : "https://player.vimeo.com/video/";
    } else {
        src = "";
    }
    return src + data.key;
}

var Utils = {

    /**
     * Checks whether a giver url is of an internal page
     * (is in page:{pageId} form and pageId is valid)
     *
     * @param url 'index'|'page:${pageID}'|${pageID}
     * @return boolean
     */
    isInternalPage: isInternalPage,

    /**
     * Returns a page's href or null for invalid input
     *
     * @param url 'index'|'page:${pageID}'|${pageID}
     * @return string|null
     */
    getPageUrl: getPageUrl,

    /**
     * Acts similar to getPageUrl, except returns original input if invalid
     */
    url: url,

    getVideoUrl: getVideoUrl

};

module.exports = Utils;

},{"../../../../editor/js/global/Pages":98,"../../../../editor/js/global/Router":100}],130:[function(require,module,exports){
'use strict';

var _ = (window._);
var jQuery = (window.jQuery);
var Promise = require('promise');
var Config = require('../../../../editor/js/global/Config');
var Notifications = require('../../../../editor/js/global/Notifications');

var hardcodedAjaxSettings = {
	xhrFields: {
		withCredentials: true
	}
};
function simpleRequest(ajaxSettings) {
	return Promise.resolve(jQuery.ajax(_.extend(hardcodedAjaxSettings, ajaxSettings)));
}
function persistentRequest(ajaxSettings) {
	return new Promise(function (resolve, reject) {
		jQuery.ajax(_.extend(hardcodedAjaxSettings, ajaxSettings, {
			notificationId: 'data-save-fail',
			onbeforeunload: function onbeforeunload() {
				return 'You have unsaved data.';
			},
			timeout: null,
			triesLeft: Infinity,
			success: function success(data) {
				Notifications.removeNotification(this.notificationId);
				window.onbeforeunload = null;
				resolve(data);
			},
			error: function error(jqXHR) {
				Notifications.addNotification({
					id: this.notificationId,
					type: Notifications.notificationTypes.error,
					text: 'Changes could not be saved. Please check your internet connection.',
					dismissible: false
				});
				window.onbeforeunload = this.onbeforeunload;

				setTimeout((function () {
					jQuery.ajax(this);
				}).bind(this), 5000);
			}
		}));
	});
}

function getProjectsApiUrl() {
	return Config.get('apiUrl') + '/projects/' + Config.get('project');
}

function getLanguageData() {
	var ProjectLanguages = require('../../../../editor/js/global/ProjectLanguages');
	return {
		language: ProjectLanguages.getDefault().id
	};
}
var converter = {
	pageToBackend: function pageToBackend(page) {

		/*
   * 1. remove dirty
   * 2. index (true, false) -> is_index (1, 0)
   */
		return _.extend(_.omit(page, 'dirty', 'index'), { is_index: page.index ? 1 : 0 });
	},
	pageFromBackend: function pageFromBackend(page) {

		/*
   * 1. id (int) -> id (string)
   * 2. is_index -> index
   */
		return _.extend(_.omit(page, 'id', 'is_index'), { id: page.id + '', index: page.is_index });
	},

	imageToBackend: function imageToBackend(image) {
		return {
			attachment: image.base64,
			sizes: image.size
		};
	}
};
var utils = {

	converter: converter,

	getPages: function getPages() {
		return persistentRequest({
			type: 'GET',
			dataType: 'json',
			url: getProjectsApiUrl() + '/pages',
			data: getLanguageData()
		}).then(function (r) {
			return _.map(r, converter.pageFromBackend);
		});
	},

	addPage: function addPage(data) {
		var requestData = _.extend(converter.pageToBackend(data), getLanguageData());
		return persistentRequest({
			type: 'POST',
			dataType: 'json',
			url: getProjectsApiUrl() + '/pages',
			data: requestData
		}).then(converter.pageFromBackend);
	},

	updatePage: function updatePage(id, data) {
		var requestData = _.omit(converter.pageToBackend(data), 'id');
		return persistentRequest({
			type: 'PUT',
			url: getProjectsApiUrl() + '/pages/' + id,
			data: requestData
		}).then(converter.pageFromBackend);
	},

	deletePage: function deletePage(id) {
		return persistentRequest({
			type: 'DELETE',
			dataType: 'json',
			url: getProjectsApiUrl() + '/pages/' + id
		});
	},

	getGlobals: function getGlobals() {
		return persistentRequest({
			type: 'GET',
			dataType: 'json',
			url: getProjectsApiUrl(),
			data: getLanguageData()
		}).then(function (r) {
			return r.globals;
		});
	},

	saveGlobals: function saveGlobals(data) {
		var requestData = _.extend({ globals: JSON.stringify(data) }, getLanguageData());
		return persistentRequest({
			type: 'PUT',
			dataType: 'json',
			url: getProjectsApiUrl(),
			data: requestData
		});
	},

	uploadImage: function uploadImage(data) {
		var requestData = converter.imageToBackend(data);
		return simpleRequest({
			type: 'POST',
			dataType: 'json',
			url: getProjectsApiUrl() + '/media',
			data: requestData
		});
	},

	getProjectLanguages: function getProjectLanguages() {
		return persistentRequest({
			type: 'GET',
			dataType: 'json',
			url: getProjectsApiUrl() + '/languages'
		});
	}

};

module.exports = utils;

},{"../../../../editor/js/global/Config":95,"../../../../editor/js/global/Notifications":97,"../../../../editor/js/global/ProjectLanguages":99,"promise":"promise"}],131:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

var hiddenClass = 'visual-bar-toggle-popover-hidden';
var shownClass = 'visual-bar-toggle-popover-show';

var BarTogglePopover = {
    componentDidMount: function componentDidMount() {
        var $window = jQuery(window),
            $node = jQuery(this.getDOMNode()),
            $button = $node.find('.visual-bar-btn'),
            $popover = $node.find('.visual-bar-popover');

        $popover.addClass(hiddenClass);

        $popover.hideAnimate = function () {
            this.removeClass(shownClass).addClass(hiddenClass);
        };
        $popover.showAnimate = function () {
            this.removeClass(hiddenClass).addClass(shownClass);
        };

        $popover.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function () {
            jQuery(this).addClass(hiddenClass);
        });

        $button.on('click', function (event) {
            event.preventDefault();

            if (!$popover.hasClass(hiddenClass)) {
                $popover.hideAnimate();
            } else {
                $popover.showAnimate();
                $popover.removeClass('visual-bar-popover-bottom');

                var popoverOffsetTop = $popover.offset().top,
                    popoverHeight = $popover.height(),
                    windowScrollTop = $window.scrollTop(),
                    windowHeight = $window.height(),
                    offsetBottom = popoverOffsetTop + popoverHeight - windowScrollTop;

                if (offsetBottom > windowHeight && windowScrollTop + popoverOffsetTop - popoverHeight >= 0) {
                    $popover.addClass('visual-bar-popover-bottom');
                }
                if (popoverOffsetTop < 0) {
                    $popover.removeClass('visual-bar-popover-bottom');
                }
            }
        });

        var isMouseDown = false,
            isMouseEnter = true;

        $popover.on('mousedown', function () {
            isMouseDown = true;
        });

        $popover.on('mouseup', function () {
            isMouseDown = false;
            if (!isMouseEnter) {
                $popover.hideAnimate();
            }
        });

        $window.on('mouseup', function () {
            if (!isMouseEnter) {
                $popover.hideAnimate();
            }
        });

        $node.on('mouseenter', function () {
            isMouseEnter = true;
        });

        var hideTimer;

        $popover.on('mouseenter', function () {
            clearTimeout(hideTimer);
            isMouseEnter = true;
        });

        $node.on('mouseleave', function () {
            isMouseEnter = false;
            if (!isMouseDown) {
                hideTimer = setTimeout(function () {
                    $popover.hideAnimate();
                }, 500);
            }
        });
    },
    mixinBarTogglePopoverHide: function mixinBarTogglePopoverHide() {
        var $node = jQuery(this.getDOMNode());
        var $popover = $node.find('.visual-bar-popover');

        $popover.removeClass(shownClass).addClass(hiddenClass);
    }
};

module.exports = BarTogglePopover;

},{}],132:[function(require,module,exports){
'use strict';

var _ = (window._);
var Globals = require('../global/Globals');

var GlobalsListener = {

    componentDidMount: function componentDidMount() {
        var key = this.mixinGlobalsListenerKey;
        if (key) {
            Globals.addChangeListener(key, this.mixinGlobalsListenerOnChange);
        } else {
            Globals.addChangeListener(this.mixinGlobalsListenerOnChange);
        }
    },

    componentWillUnmount: function componentWillUnmount() {
        var key = this.mixinGlobalsListenerKey;
        if (key) {
            Globals.removeChangeListener(key, this.mixinGlobalsListenerOnChange);
        } else {
            Globals.removeChangeListener(this.mixinGlobalsListenerOnChange);
        }
    },

    mixinGlobalsListenerOnChange: function mixinGlobalsListenerOnChange() {
        // the shouldUpdate check is done this way instead of using shouldComponentUpdate
        // lifecycle method because when using forceUpdate the former isn't called
        var shouldUpdate = this.mixinGlobalsListenerShouldUpdate ? this.mixinGlobalsListenerShouldUpdate() : true;
        if (shouldUpdate) {
            this.forceUpdate();
        }
    }

};

module.exports = GlobalsListener;

},{"../global/Globals":96}],133:[function(require,module,exports){
'use strict';

var _ = (window._);
var Pages = require('../global/Pages');

var PagesListener = {

    componentDidMount: function componentDidMount() {
        Pages.addChangeListener(this.mixinPagesListenerOnChange);
    },

    componentWillUnmount: function componentWillUnmount() {
        Pages.removeChangeListener(this.mixinPagesListenerOnChange);
    },

    mixinPagesListenerOnChange: function mixinPagesListenerOnChange() {
        // the shouldUpdate check is done this way instead of using shouldComponentUpdate
        // lifecycle method because when using forceUpdate the former isn't called
        var shouldUpdate = this.mixinPageListenerShouldUpdate ? this.mixinPageListenerShouldUpdate() : true;
        if (shouldUpdate) {
            this.forceUpdate();
        }
    }

};

module.exports = PagesListener;

},{"../global/Pages":98}],134:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ = (window._),
    React = (window.React),
    Model = require('./../Model'),
    Visual = require('./../Visual');

// Actually this is a hack to get the following syntax in components:
//
//     <Vi property="title" />
//     <Vi property="description" />
//     <Vi property="buttonLine" />
//
// Compare it with the full way of specifying editable element:
//
//    <Visual model={Model['Text']} value={v.title} onChange={this.handleChange.bind(null, 'title')} />
//    <Visual model={Model['HTML']} value={v.description} onChange={this.handleChange.bind(null, 'description')} />
//    <Visual model={Model['ButtonLine']} value={v.buttonLine} onChange={this.handleChange.bind(null, 'buttonLine')} />
//
// The former syntax is less error prone and more intuitive. Although the
// latter one will always be available.
//
// Note about implementation
// =========================
//
// React handles mixins in a special way. Here is the quote:
//
//     http://facebook.github.io/react/docs/reusable-components.html#mixins
//
//     > A nice feature of mixins is that if a component is using multiple
//     > mixins and several mixins define the same lifecycle method (i.e.
//     > several mixins want to do some cleanup when the component is destroyed),
//     > **all of the lifecycle methods are guaranteed to be called**.
//     >
//     > Methods defined on mixins run in the order mixins were listed,
//     > followed by a method call on the component.
//
// So expressing Vi as a mixin guarantees that:
//
//     1. Mixin.Vi.componentWillMount will always be called first;
//     2. componentWillMount handlers defined in a class will be called as expected.
//
var Vi = {
    // Each rendered component should have its own version of <Vi />.
    // It seems this is the only way to create <Vi /> bound to the element.
    componentWillMount: function componentWillMount() {
        var host = this;
        this._Vi = React.createClass({
            displayName: '_Vi',

            render: function render() {

                var propertyName = this.props.property,
                    props = _.omit(this.props, 'property'),
                    model,
                    value,
                    contextValue,
                    onChange;

                if (!_.has(host._model.properties, propertyName)) {
                    throw 'Model[' + host._model.name + ']: there is no such a property (' + propertyName + ')';
                }

                model = Model[host._model.properties[propertyName].type];
                value = host.props.value[propertyName];
                if (value) {
                    contextValue = host.props.contextValue && host.props.contextValue[propertyName];
                }
                onChange = this.props.onChange || host.handleChange.bind(null, propertyName);

                return React.createElement(Visual, _extends({}, props, { model: model, value: value, contextValue: contextValue, onChange: onChange }));
            }
        });
    }
};

module.exports = Vi;

},{"./../Model":1,"./../Visual":3}],135:[function(require,module,exports){
'use strict';

var T = 'array',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Definition = require('../../../../editor/js/helper/Definition'),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    Model = require('../../../../editor/js/Model'),
    Visual = require('../../../../editor/js/Visual'),
    kv = require('../../../../editor/js/helper/kv'),
    GridItemFinder = require('../../../../editor/js/helper/dragdrop/itemFinder/GridItemFinder'),
    distance = require('../../../../editor/js/helper/dragdrop/distance');

var ddActive = false,
    ddCursorTarget = null,
    ddCursorValue = null;

ModelDefinition[T] = ModelDefinition.extend({
    items: [],
    value: []
});

(function () {

    var definition = ModelDefinition[T];

    // array values are stored in the following way:
    //
    //     { type: 'string', value: 'Aenean nibh lorem, rhoncus non elit eget, iaculis feugiat massa' },
    //     { type: 'string', value: 'Integer vel fermentum tortor. Sed dapibus mollis ante' },
    //     ...
    //
    // Because arrays can contain values of different type it is necessary
    // to keep *type* field.

    // Extract value out from definition. *override* parameter allows a value
    // from ModelDefinition to be overridden in a dynamic way. For example,
    // without it the following syntax will not be workable:
    //
    //		{
    //			type: 'Button',
    //			value: {
    // 				title: 'Hello',
    //				className: 'btn btn-primary'
    //			}
    //		}
    //
    function _value(override) {
        var _this = this,
            ret = [];

        _.each(_.isArray(override) ? override : this.value, function (v) {
            if ('debug') {
                if (!(ModelDefinition[v.type] instanceof Definition)) {
                    throw 'ModelDefinition[' + _this.name + ']: *item.type* is referenced to undefined ModelDefinition[' + v.type + ']';
                }
                if (_this.items !== '*' && !_.contains(_this.items, v.type)) {
                    throw 'ModelDefinition[' + _this.name + ']: ' + v.type + ' is no accepted';
                }
            }
            ret.push({ type: v.type, value: ModelDefinition[v.type]._value(v.value) });
        });

        return ret;
    }

    definition._value = _value;
})();

VisualDefinition[T] = VisualDefinition.extend({
    itemKeys: [], // keys are needed to prevent strange react behaviours when cloning / removing from arrays
    getInitialState: function getInitialState() {
        return {
            dd: null
        };
    },
    componentWillMount: function componentWillMount() {
        var v = this.value();
        this.itemKeys = _.map(v, function () {
            return _.uniqueId('item-');
        });
    },
    renderForEdit: function renderForEdit(v, Vi) {
        var items, container;

        items = _.map(v, this.renderItem);
        items = this.reorderItems(items);
        container = this.wrapContainer(items, this);

        if ('debug') {
            if (!React.isValidElement(container)) {
                console.error(this.props.model.name, 'array.wrapContainer should return a ReactElement');
                return React.createElement(
                    'p',
                    null,
                    'error: array.wrapContainer should return a ReactElement'
                );
            }
        }

        return React.addons.cloneWithProps(container, _.omit(this.props, 'children', 'model', 'value', 'onChange'));
    },
    renderItem: function renderItem(itemData, itemIndex) {
        var item = this.item(itemData, itemIndex);
        item = this.getItem(item, itemIndex);
        item = this.wrapItem(item, itemIndex, itemData.value, itemData.type, this);
        if ('debug') {
            if (!React.isValidElement(item)) {
                console.error(this.props.model.name, 'array.wrapItem should return a ReactElement');
                return React.createElement(
                    'p',
                    null,
                    'error: array.wrapItem should return a ReactElement'
                );
            }
        }
        return React.addons.cloneWithProps(item, { key: this.itemKeys[itemIndex] });
    },
    onClone: function onClone(index) {},
    onDelete: function onDelete(index) {},
    duplicate: function duplicate(itemIndex) {
        this.itemKeys.splice(itemIndex + 1, 0, _.uniqueId('item-'));
        this.props.onChange(React.addons.update(this.props.value, { $splice: [[itemIndex + 1, 0, JSON.parse(JSON.stringify(this.props.value[itemIndex]))]] }));
        this.onClone(itemIndex);
    },
    remove: function remove(itemIndex) {
        this.itemKeys.splice(itemIndex, 1);
        this.props.onChange(React.addons.update(this.props.value, { $splice: [[itemIndex, 1]] }));
        this.onDelete(itemIndex);
    },
    insert: function insert(value, index) {
        index = index >= 0 ? index : this.props.value.length;
        this.itemKeys.splice(index, 0, _.uniqueId('item-'));
        this.props.onChange(React.addons.update(this.props.value, { $splice: [[index, 0, value]] }));
    },
    handleItemChange: function handleItemChange(index, value) {
        this.props.onChange(React.addons.update(this.props.value, kv(index, { value: { $set: value } })));
    },
    wrapContainer: function wrapContainer(children) {
        return React.createElement(
            'ul',
            null,
            children
        );
    },
    wrapItem: function wrapItem(item, itemIndex) {
        return React.createElement(
            'li',
            null,
            item
        );
    },
    item: function item(itemData, itemIndex) {
        if (!Model[itemData.type]) {
            console.error('invalid block: ', itemData.type);
        }
        return React.createElement(Visual, { model: Model[itemData.type], value: itemData.value, onChange: this.handleItemChange.bind(this, itemIndex), index: itemIndex });
    },
    getItem: function getItem(item) {
        return item;
    },
    reorderItems: function reorderItems(items) {
        return items;
    },

    // Drag & Drop
    ddReorderItems: function ddReorderItems(items) {
        var dd = this.state.dd || { source: false, target: false };
        if (dd.source !== false) {
            if (dd.source != dd.target) {
                items.splice(dd.target, 0, items.splice(dd.source, 1)[0]);
            }
        }
        return items;
    },
    ddMouseMove: function ddMouseMove(event) {
        if (ddActive) {
            return;
        }
        var $target = jQuery(event.target);
        ddCursorValue = $target.css('cursor');
        ddCursorTarget = event.target;

        // console.log($target.is('.visual-dd-ignore'), $target.closest('.visual-dd-ignore').length === 0);

        if (!jQuery(ddCursorTarget).is('.visual-content-editable-wrap, textarea, input') && $target.closest('.visual-content-editable-wrap, textarea, input').length === 0 && $target.is(':not(.visual-dd-ignore)') && $target.closest('.visual-dd-ignore').length === 0) {
            jQuery(ddCursorTarget).css('cursor', 'move');
        }

        if (jQuery(ddCursorTarget).closest('.visual-content-editable-wrap').length > 0) {
            jQuery(ddCursorTarget).closest('.visual-content-editable-wrap').css('cursor', 'auto');
        }

        if (jQuery(ddCursorTarget).is('textarea, input')) {
            jQuery(ddCursorTarget).css('cursor', 'auto');
        }
    },
    ddMouseDown: function ddMouseDown(ref, event) {

        var $target = jQuery(event.target);

        if (event.button != 0 || ddActive || $target.closest('[contenteditable],textarea,input').length > 0 || jQuery(event.currentTarget).closest('.visual-dd-stop').length > 0 || $target.is('.visual-dd-ignore') || $target.closest('.visual-dd-ignore').length > 0) {
            return;
        }

        var listeners = {};
        listeners.mousemove = this.ddPendingMove.bind(null, listeners, ref, event.clientX, event.clientY);
        listeners.mouseup = this.ddPendingUp.bind(null, listeners);

        jQuery(document).on(listeners);
        event.preventDefault();
    },
    ddPendingMove: function ddPendingMove(listeners, ref, startX, startY, event) {
        if (distance(startX, startY, event.clientX, event.clientY) > 5) {
            this.ddStart(ref);
            jQuery(document).off(listeners);
        }
    },
    ddPendingUp: function ddPendingUp(listeners) {
        jQuery(document).off(listeners);
    },
    ddStart: function ddStart(ref) {
        ddActive = true;
        jQuery(this.getDOMNode()).trigger('visual-bar-suspend');
        var r = this.refs[ref].getDOMNode().getBoundingClientRect();
        this.setState({ dd: {
                source: ref,
                target: ref,
                finder: new GridItemFinder(this, _.range(0, this.props.value.length)),
                follower: {
                    sx: r.left - event.clientX,
                    sy: r.top - event.clientY,
                    // px: rect.width * 0.25,
                    // py: rect.height * 0.25,
                    style: {
                        position: 'fixed',
                        zIndex: 1000000,
                        top: r.top,
                        left: r.left,
                        width: r.width,
                        margin: 0,
                        opacity: .75,
                        boxShadow: '0px 0px 5px 2px rgba(0,0,0,0.55)',
                        cursor: 'move'
                    }
                }
            } }, (function () {
            // It is for overblock at drag and drop.
            var a = jQuery(this.refs[ref].getDOMNode()).next('div').find('.visual-over-block').trigger('mouseenter');
        }).bind(this));
    },
    ddMouseUp: function ddMouseUp(follower, event) {
        ddActive = false;
        jQuery(this.getDOMNode()).trigger('visual-bar-resume');
        var v,
            dd = this.state.dd;
        if (dd.source != dd.target) {
            this.itemKeys.splice(dd.target, 0, this.itemKeys.splice(dd.source, 1)[0]);
            v = this.props.value.slice();
            v.splice(dd.target, 0, v.splice(dd.source, 1)[0]);
            this.props.onChange(v);
        }
        this.setState({ dd: false });
    },
    ddPointer: function ddPointer(x, y) {
        var dd = this.state.dd,
            f = dd.finder.find(x, y),
            index = f.ref + (f.after ? 1 : 0);
        this.setState({ dd: React.addons.update(dd, { target: { $set: index } }) });
    }
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    // generic array cannot be used as object's property
    property: null
};

},{"../../../../editor/js/Model":1,"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/Visual":3,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/helper/Definition":102,"../../../../editor/js/helper/dragdrop/distance":108,"../../../../editor/js/helper/dragdrop/itemFinder/GridItemFinder":115,"../../../../editor/js/helper/kv":125}],136:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'arrayByBar',
    React = (window.React),
    ModelDefinition = require('../../ModelDefinition'),
    VisualDefinition = require('../../VisualDefinition'),
    Visual = require('../../Visual'),
    Bar = require('../../component/bar/Bar'),
    MouseFollower = require('../../helper/MouseFollower');

ModelDefinition[T] = require('./array').ModelDefinition.extend({});

VisualDefinition[T] = require('./array').VisualDefinition.extend({
    defaultProps: {
        minItems: 0,
        maxItems: 9999,
        toolbarProps: {}
    },
    getItem: function getItem(item, itemIndex) {
        // FIXME: It seems mostly like a hack
        if (Visual.renderMethod == 'renderForView') {
            return item;
        }

        var dd = this.state.dd || { source: false, target: false },
            classNameSource = dd.source === itemIndex ? 'visual-element-placeholder' : '';
        var ret = React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                { ref: itemIndex, onMouseMove: this.ddMouseMove, onMouseDown: this.ddMouseDown.bind(null, itemIndex), className: classNameSource },
                item
            ),
            dd.source === itemIndex ? React.createElement(
                MouseFollower,
                _extends({}, dd.follower, { onMouseUp: this.ddMouseUp, onPointer: this.ddPointer }),
                React.createElement(
                    'div',
                    null,
                    item
                )
            ) : null
        );

        var maxItems = this.props.maxItems;
        var minItems = this.props.minItems;
        var itemLength = this.value().length;
        return React.createElement(
            Bar,
            _extends({
                item: 'remove',
                onClick: this.remove.bind(null, itemIndex),
                addEvent: false,
                active: itemLength > minItems
            }, this.props.toolbarProps),
            React.createElement(
                Bar,
                _extends({
                    item: 'clone',
                    onClick: this.duplicate.bind(null, itemIndex),
                    addEvent: false,
                    active: itemLength < maxItems
                }, this.props.toolbarProps),
                ret
            )
        );
    },
    reorderItems: function reorderItems(items) {
        return this.ddReorderItems(items);
    }
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../ModelDefinition":2,"../../Visual":3,"../../VisualDefinition":4,"../../component/bar/Bar":67,"../../helper/MouseFollower":103,"./array":135}],137:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'arrayByBlock',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../ModelDefinition'),
    VisualDefinition = require('../../VisualDefinition'),
    Visual = require('../../Visual'),
    MouseFollower = require('../../helper/MouseFollower');

ModelDefinition[T] = require('./array').ModelDefinition.extend({});

VisualDefinition[T] = require('./array').VisualDefinition.extend({
	defaultProps: {
		minItems: 0,
		maxItems: 9999
	},
	getItem: function getItem(item, itemIndex) {
		// FIXME: It seems mostly like a hack
		if (Visual.renderMethod == 'renderForView') {
			return item;
		}

		var maxItems = this.props.maxItems;
		var minItems = this.props.minItems;
		var itemLength = this.value().length;

		var destroyButton;
		if (itemLength > minItems) {
			destroyButton = React.createElement(
				'div',
				{ className: 'visual-array-by-block-button bid-block-change-button', onClick: this.remove.bind(null, itemIndex) },
				React.createElement('i', { className: 'visual-icon-remove' })
			);
		}

		var cloneButton;
		if (itemLength < maxItems) {
			cloneButton = React.createElement(
				'div',
				{ className: 'visual-array-by-block-button bid-block-change-button', onClick: this.duplicate.bind(null, itemIndex) },
				React.createElement('i', { className: 'visual-icon-clone' })
			);
		}

		var dd = this.state.dd || { source: false, target: false },
		    sourceClassName = dd.source === itemIndex ? 'visual-element-placeholder' : '',
		    wrapClassName = dd.source === itemIndex ? ' visual-element-placeholder-wrap' : '';
		return React.createElement(
			'div',
			{ className: "visual-array-by-block" + wrapClassName },
			React.createElement('div', { className: 'visual-array-by-block-inner-1' }),
			React.createElement('div', { className: 'visual-array-by-block-inner-2' }),
			React.createElement(
				'div',
				{ className: 'visual-array-by-block-bar' },
				cloneButton,
				destroyButton
			),
			React.createElement(
				'div',
				{ ref: itemIndex, onMouseMove: this.ddMouseMove, onMouseDown: this.ddMouseDown.bind(null, itemIndex), className: sourceClassName },
				item
			),
			dd.source === itemIndex ? React.createElement(
				MouseFollower,
				_extends({}, dd.follower, { onMouseUp: this.ddMouseUp, onPointer: this.ddPointer }),
				React.createElement(
					'div',
					null,
					item
				)
			) : null
		);
	},
	reorderItems: function reorderItems(items) {
		return this.ddReorderItems(items);
	}
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../ModelDefinition":2,"../../Visual":3,"../../VisualDefinition":4,"../../helper/MouseFollower":103,"./array":135}],138:[function(require,module,exports){
'use strict';

var T = 'boolean',
    React = (window.React),
    ModelDefinition = require('../../ModelDefinition'),
    VisualDefinition = require('../../VisualDefinition');

ModelDefinition[T] = ModelDefinition.extend({
    value: false
});

(function () {

    var definition = ModelDefinition[T];

    function _value(override) {
        return Boolean(override);
    }

    definition._value = _value;
})();

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    // boolean has no Visual editor
    VisualDefinition: null,
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../ModelDefinition":2,"../../VisualDefinition":4}],139:[function(require,module,exports){
'use strict';

var T = 'object',
    _ = (window._),
    Definition = require('./../../helper/Definition'),
    ModelDefinition = require('./../../ModelDefinition'),
    deepExtend = require('deep-extend');

ModelDefinition[T] = ModelDefinition.extend({
	properties: {}
});

(function () {

	var definition = ModelDefinition[T],
	    pre = definition.extend;

	// Extract value out from definition. *override* parameter allows a value
	// from ModelDefinition to be overridden in a dynamic way. For example,
	// without it the following syntax will not be workable:
	//
	//		{
	//			type: 'Button',
	//			value: {
	// 				title: 'Hello',
	//				className: 'btn btn-primary'
	//			}
	//		}
	//
	function _value(override) {
		var _this = this,
		    ret = {};
		_.each(this.properties, function (v, k) {
			if ('debug') {
				if (!_.has(v, 'type')) {
					throw 'ModelDefinition[' + _this.name + '].' + k + ': *type* field is not defined';
				}
				if (!(ModelDefinition[v.type] instanceof Definition)) {
					throw 'ModelDefinition[' + _this.name + '].' + k + ': *type* field is referenced to undefined ModelDefinition[' + v.type + ']';
				}
			}
			ret[k] = v.value === null ? null : ModelDefinition[v.type]._value(v.value);
		});
		deepExtend(ret, override);
		return ret;
	}

	// When an object is extended its *properties* are merged together
	function extend(override) {
		var properties = _.extend({}, this.properties, override.properties || {});
		return pre.call(this, _.extend({}, override, { properties: properties }));
	}

	definition.extend = extend;
	definition._value = _value;
})();

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	// generic object has no Visual editor
	VisualDefinition: null,
	type: T,
	// generic object cannot be used a object's property
	property: null
};

},{"./../../ModelDefinition":2,"./../../helper/Definition":102,"deep-extend":"deep-extend"}],140:[function(require,module,exports){
'use strict';

var T = 'private',
    _ = (window._),
    ModelDefinition = require('../../ModelDefinition');

ModelDefinition[T] = ModelDefinition.extend({
    value: undefined
});

(function () {

    var definition = ModelDefinition[T];

    // Extract value out from definition. *override* parameter allows a value
    // from ModelDefinition to be overridden in a dynamic way. For example,
    // without it the following syntax will not be workable:
    //
    //		{
    //			type: 'Button',
    //			value: {
    // 				title: 'Hello',
    //				className: 'btn btn-primary'
    //			}
    //		}
    //
    function _value(override) {
        if (_.isUndefined(override)) {
            return _.extend({}, this.value);
        }
        return _.extend({}, override);
    }

    definition._value = _value;
})();

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    // private type has no Visual editor
    VisualDefinition: null,
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../ModelDefinition":2}],141:[function(require,module,exports){
'use strict';

var T = 'string',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../ModelDefinition'),
    VisualDefinition = require('../../VisualDefinition');

ModelDefinition[T] = ModelDefinition.extend({
	value: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
});

(function () {

	var definition = ModelDefinition[T];

	// Extract value out from definition. *override* parameter allows a value
	// from ModelDefinition to be overridden in a dynamic way. For example,
	// without it the following syntax will not be workable:
	//
	//		{
	//			type: 'Button',
	//			value: {
	// 				title: 'Hello',
	//				className: 'btn btn-primary'
	//			}
	//		}
	//
	function _value(override) {
		if (_.isString(override)) {
			return override;
		}
		return this.value;
	}

	definition._value = _value;
})();

VisualDefinition[T] = VisualDefinition.extend({
	handleMouseEnter: function handleMouseEnter(before, after, event) {
		before(event);
		jQuery(event.target).attr('contenteditable', true);
		after(event);
	},
	handleMouseLeave: function handleMouseLeave(before, after, event) {
		before(event);
		// var t = jQuery(event.target);
		// t.attr('contenteditable', false);
		// this.props.onChange(t.text());
		after(event);
	},
	handleDebounceSave: _.debounce(function (event) {

		// guard against cases when the component
		// gets unmounted before this function is executed
		// that way this.getDOMNode would throw
		try {
			var value = jQuery(this.getDOMNode()).text();
			if (value !== this.value()) {
				this.props.onChange(value);
			}
		} catch (e) {}
	}, 500),
	renderForEdit: function renderForEdit() {
		var nop = function nop() {},
		    props = _.omit(this.props, 'children', 'model', 'value', 'onChange'),
		    child = React.Children.only(this.props.children);
		return React.addons.cloneWithProps(child, _.extend(props, {
			onMouseEnter: this.handleMouseEnter.bind(null, child.onMouseEnter || nop, props.onMouseEnter || nop),
			onMouseLeave: this.handleMouseLeave.bind(null, child.onMouseLeave || nop, props.onMouseLeave || nop),
			onBlur: this.handleDebounceSave,
			onKeyUp: this.handleDebounceSave
		}));
	},
	renderForView: function renderForView() {
		var props = _.omit(this.props, 'children', 'model', 'value', 'onChange'),
		    child = React.Children.only(this.props.children);
		return React.addons.cloneWithProps(child, props);
	}
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../ModelDefinition":2,"../../VisualDefinition":4}],142:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = (window.React);
var _ = (window._);
var Link = require('../../../component/Link');

var MenuLink = React.createClass({
    displayName: 'MenuLink',

    render: function render() {
        return React.createElement(
            Link,
            _extends({ href: this.props.item.id }, _.omit(this.props, 'item', 'href')),
            this.props.children
        );
    }
});

module.exports = MenuLink;

},{"../../../component/Link":6}],143:[function(require,module,exports){
'use strict';

var T = 'Core.Menu',
    _ = (window._),
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Pages = require('../../../../../editor/js/global/Pages'),
    Router = require('../../../../../editor/js/global/Router'),
    GlobalsListener = require('../../../../../editor/js/mixin/GlobalsListener'),
    MenuLink = require('./MenuLink'),
    Bar = require('../../../../../editor/js/component/bar/Bar'),
    getMenu = require('../../../../../editor/js/helper/utils/MenuUtils').getMenu;

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		menuId: VisualString.property('some-menu-id')
	}
});

VisualDefinition[T] = VisualDefinition.extend({

	menu: null,

	mixins: [GlobalsListener],

	mixinGlobalsListenerKey: 'menus',

	componentWillMount: function componentWillMount() {
		this.menu = getMenu(this.props.value.menuId);
	},

	onClickOverlayOpener: function onClickOverlayOpener() {
		jQuery(this.getDOMNode()).trigger('navOverlay.visual');
	},

	renderMenu: function renderMenu() {
		// we use getMenu() instead of this.menu because
		// the menu might have changed and we need a fresh copy
		var menu = getMenu(this.props.value.menuId);
		return this.renderTree(menu, 0);
	},

	renderTree: function renderTree(item, depth) {
		if (!item) {
			return null;
		}

		var children = _.map(item.children, function (menuItem, index) {
			var page = Pages.getPageById(menuItem.pageId),
			    mergedItem = _.extend({}, menuItem, page),
			    key = index;

			// return page && React.addons.cloneWithProps(this.renderItem(mergedItem, depth), {key: key});
			return page && this.renderItem(mergedItem, depth);
		}, this);

		return this.renderContainer(children, depth);
	},

	renderContainer: function renderContainer(children, depth) {
		return React.createElement(
			'ul',
			{ className: 'menu-depth-' + depth },
			children
		);
	},

	renderItem: function renderItem(item, depth) {
		var children = item.children.length ? this.renderTree(item, depth + 1) : null;
		return React.createElement(
			'li',
			null,
			React.createElement(
				MenuLink,
				{ item: item },
				item.title
			),
			children
		);
	},
	/* show menu with menu icon */
	/*renderForEdit: function() {
 	return (
 		<div className="visual-menu-editor-wrap">
 			<div className="visual-menu-editor-button" onClick={this.onClickOverlayOpener}>
 				<i className="visual-icon-menu-edit" />
 			</div>
 			{this.renderMenu()}
 		</div>
 	);
 },*/
	renderForEdit: function renderForEdit() {
		return this.renderMenu();
	},

	renderForView: function renderForView() {
		return this.renderMenu();
	},

	/* Helper methods provided for extenders */

	itemChildrenCount: function itemChildrenCount(item) {
		return item.children.length;
	},

	itemHasChildren: function itemHasChildren(item) {
		return Boolean(this.itemChildrenCount(item));
	},

	itemIsCurrent: function itemIsCurrent(item) {
		return item.pageId === Router.getActivePageId();
	},

	itemHasCurrent: function itemHasCurrent(item) {
		if (!this.itemHasChildren(item)) {
			return false;
		}

		for (var i = 0, len = item.children.length; i < len; i++) {
			if (this.itemIsCurrent(item.children[i]) || this.itemHasCurrent(item.children[i])) {
				return true;
			}
		}

		return false;
	}

});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/component/bar/Bar":67,"../../../../../editor/js/global/Pages":98,"../../../../../editor/js/global/Router":100,"../../../../../editor/js/helper/utils/MenuUtils":126,"../../../../../editor/js/mixin/GlobalsListener":132,"../../../../../editor/js/model/basic/object":139,"../../../../../editor/js/model/basic/string":141,"./MenuLink":142}],144:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Core.Color',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualString.ModelDefinition.extend({
	value: '#777'
});

VisualDefinition[T] = VisualDefinition.extend({
	defaultProps: {
		toolbarProps: {},
		onPreview: function onPreview(v) {
			console.warn('The Color onPreview function should be overridden.', 'It should change some style with jQuery (e.g. background-color).', 'It should make use of the value provided:', v);
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Bar,
			_extends({
				item: 'color',
				value: v,
				onChange: this.props.onChange,
				onPreview: this.props.onPreview
			}, this.props.toolbarProps),
			this.props.children
		);
	},
	renderForView: function renderForView(v, Vi) {
		return this.props.children;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/string":141}],145:[function(require,module,exports){
'use strict';

var T = 'Core.Icon',
    React = (window.React),
    ModelDefinition = require('../../ModelDefinition'),
    VisualDefinition = require('../../VisualDefinition'),
    VisualString = require('../basic/string'),
    Bar = require('../../component/bar/Bar');

ModelDefinition[T] = VisualString.ModelDefinition.extend({
	value: 'fa fa-heart'
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Bar,
			{
				item: 'icon',
				value: v,
				trigger: this.props.trigger,
				onChange: this.props.onChange },
			this.props.children
		);
	},
	renderForView: function renderForView(v, Vi) {
		return this.props.children;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../ModelDefinition":2,"../../VisualDefinition":4,"../../component/bar/Bar":67,"../basic/string":141}],146:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Core.Image',
    _ = (window._),
    Promise = require('promise'),
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	src: VisualString.property('http://placehold.it/100'),
	size: VisualString.property('100x100xR')
});

VisualDefinition[T] = VisualDefinition.extend({
	defaultProps: {
		toolbarProps: {
			inside: true
		},
		onPreview: function onPreview(v) {
			console.warn('The Image onPreview function should be overridden.', 'It should change the src attribute or background-image style with jQuery.', 'It should make use of the value provided:', v);
		}
	},
	handleChange: function handleChange(v) {
		var size = this.props.value.size;
		this.props.onChange({
			src: v[size] || v[size.toLowerCase()],
			size: size
		});
	},
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Bar,
			_extends({
				item: 'image',
				size: v.size,
				onChange: this.handleChange,
				onPreview: this.props.onPreview
			}, this.props.toolbarProps),
			this.props.children
		);
	},
	renderForView: function renderForView(v, Vi) {
		return this.props.children;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141,"promise":"promise"}],147:[function(require,module,exports){
'use strict';

var T = 'Core.Link',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualString.ModelDefinition.extend({
	value: ''
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Bar,
			{
				item: 'link',
				value: v,
				trigger: this.props.trigger,
				locked: this.props.locked,
				onChange: this.props.onChange
			},
			this.props.children
		);
	},
	renderForView: function renderForView(v, Vi) {
		return this.props.children;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/string":141}],148:[function(require,module,exports){
'use strict';

var T = 'Core.Map',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),

//VisualObject = require('visual/model/basic/object'),
VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualString.ModelDefinition.extend({
    properties: {
        map: ''
    }
});

VisualDefinition[T] = VisualDefinition.extend({
    renderForEdit: function renderForEdit(v, Vi) {
        return React.createElement(
            Bar,
            {
                item: 'map',
                value: v,
                onChange: this.props.onChange,
                inside: true
            },
            this.props.children
        );
    },
    renderForView: function renderForView(v, Vi) {
        return this.props.children;
    }
});

module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/string":141}],149:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Core.Opacity',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualString.ModelDefinition.extend({
	value: '50'
});

VisualDefinition[T] = VisualDefinition.extend({
	defaultProps: {
		toolbarProps: {},
		onPreview: function onPreview() {
			console.warn('This function have to rewrite in theme and it should change attribute with jQuery.');
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Bar,
			_extends({
				item: 'opacity',
				value: v,
				onChange: this.props.onChange,
				onPreview: this.props.onPreview
			}, this.props.toolbarProps),
			this.props.children
		);
	},
	renderForView: function renderForView(v, Vi) {
		return this.props.children;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/string":141}],150:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

var Editor = function Editor(el, options) {
    this.$el = jQuery(el);
    this.options = options;
    this._init();
};

Editor.prototype = {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '', // accessing navigator without default crashes at compilation
    bold: "b", // IE ставит вместо тега <b> тег <strong>
    _init: function _init() {
        var changePositionBound = this._changePosition.bind(this);

        var downmouseIn = false;
        this.$el.on('mousedown', function () {
            downmouseIn = true;
        });
        jQuery(window).on('mouseup', function () {
            setTimeout(function () {
                if (downmouseIn) {
                    downmouseIn = false;
                    changePositionBound();
                }
            }, 0);
        });

        this.$el.on('keyup', changePositionBound);
        this.$el.on('input', changePositionBound);
    },
    setCaretPosition: function setCaretPosition(elem, caretPos) {
        if (document.selection) {
            // ie
            elem.focus();
            var range = document.selection.createRange();
            range.moveStart('character', -elem.value.length);
            range.moveStart('character', caretPos);
            range.moveEnd('character', 0);
            range.select();
        } else if (elem.selectionStart || elem.selectionStart == '0') {
            // Mozilla
            elem.selectionStart = caretPos;
            elem.selectionEnd = caretPos;
            elem.focus();
        }
    },
    getCaretPosition: function getCaretPosition(elem) {
        var caretPos = 0;

        if (document.selection) {
            // ie
            elem.focus();
            var range = document.selection.createRange();
            elem.moveStart('character', -elem.value.length);
            caretPos = range.text.length;
        } else if (elem.selectionStart || elem.selectionStart == '0') {
            // Mozilla
            caretPos = elem.selectionStart;
        }

        return caretPos;
    },

    _changePosition: function _changePosition(e) {
        var html = this._getSelection();
        var range = this.range();
        if (!range) return;
        var parentNode = range.startContainer.parentNode;
        if (parentNode.tagName.toLowerCase() == 'div') parentNode = range.startContainer;
        var elementDiv = jQuery(parentNode).closest("div");
        var parentDivHTML = elementDiv[0].innerHTML;
        //parentDivHTML = parentDivHTML.replace(/<br>|<br \/>/g,'');
        var findP = elementDiv.find("p,:header");
        if (findP[0] == undefined) {
            elementDiv[0].innerHTML = "<p>" + parentDivHTML + "</p>";
            var textParentDivHTML = elementDiv[0].textContent;
            this.selectText(elementDiv[0], textParentDivHTML.replace(/(\n(\r)?)/g, ''));
        }
        this.saveSelection();
        var testHTML = this.clearEmptyTeg('', html, ["br", "hr", "div"]);
        if (this.trim(testHTML).length != 0) {
            var position = this._getSelectionPosition(),
                data = this._getCurrentValues();
            this.options.showOrChangePosition(position, data);
        } else {
            this.options.hide();
        }
    },
    isDescendant: function isDescendant(parent, child) {
        if (!parent || !child) {
            return false;
        }
        var node = child.parentNode;
        while (node !== null) {
            if (node === parent) {
                return true;
            }
            node = node.parentNode;
        }
    },
    probelPoKrayam: function probelPoKrayam(html) {
        var left, right, ResultLeft, ResultRight;
        left = html.match(/^([\s|&nbsp;]{1,})/);
        right = html.match(/([\s|&nbsp;]{1,})$/);
        html = html.replace(/^(?:[\s|&nbsp;]{1,})|(?:[\s|&nbsp;]{1,})$/, "");
        if (left) ResultLeft = left[1].replace(/\s/, "&nbsp;");else ResultLeft = '';
        if (right) ResultRight = right[1].replace(/\s/, "&nbsp;");else ResultRight = '';

        return ResultLeft + html + ResultRight;
    },
    in_array: function in_array(value, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    },
    selectText: function selectText(element, textToSelect) {
        var elementText;
        if (typeof element.textContent == "string" && document.createRange && window.getSelection) {
            elementText = element.textContent;
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElement(element);
            elementText = textRange.text;
        }

        var startIndex = elementText.indexOf(textToSelect);
        this.setSelectionRange(element, startIndex, startIndex + textToSelect.length);
    },
    getTextNodesIn: function getTextNodesIn(node) {
        var textNodes = [];
        if (node.nodeType == 3) {
            textNodes.push(node);
        } else {
            var children = node.childNodes;
            for (var i = 0, len = children.length; i < len; ++i) {
                textNodes.push.apply(textNodes, this.getTextNodesIn(children[i]));
            }
        }
        return textNodes;
    },
    setSelectionRange: function setSelectionRange(el, start, end) {
        if (document.createRange && window.getSelection) {
            var range = document.createRange();
            range.selectNodeContents(el);
            var textNodes = this.getTextNodesIn(el);
            var foundStart = false;
            var charCount = 0,
                endCharCount;

            for (var i = 0, textNode; textNode = textNodes[i++];) {
                endCharCount = charCount + textNode.length;
                if (!foundStart && start >= charCount && (start < endCharCount || start == endCharCount && i < textNodes.length)) {
                    range.setStart(textNode, start - charCount);
                    foundStart = true;
                }
                if (foundStart && end <= endCharCount) {
                    range.setStart(textNode, end - charCount);
                    range.setEnd(textNode, end - charCount);
                    break;
                }
                charCount = endCharCount;
            }

            //range.collapse(true);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(true);
            textRange.moveEnd("character", end);
            textRange.moveStart("character", start);
            textRange.select();
        }
    },
    paste: function paste(e) {
        // убрал, т.к если оставить при вставке в конец параграфа текста, он помещается в начало 2 параграфа
        //this.restoreSelection();
        var header;
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var parentNodeStart = range.startContainer.parentNode;
        var restoreSetStart = range.startContainer;
        var restoreSetOffSet = range.startOffset;
        if (parentNodeStart.tagName.toLowerCase() == 'div') parentNodeStart = range.startContainer;

        // если убрать, то в мозиле если нажать crtl + a,crtl + v,выдает ошибку
        if (parentNodeStart.tagName.toLowerCase() == 'div') parentNodeStart = parentNodeStart.firstChild;
        var jParent = jQuery(parentNodeStart).closest("div");

        var divSelection = window.getSelection().getRangeAt(0).cloneRange();

        var html, div, elementsDiv;
        div = document.createElement("div");
        if (this.ua.search(/Trident/) > 0) {
            html = window.clipboardData.getData('Text');
        } else {
            if (this.in_array('text/html', e.clipboardData.types)) header = 'text/html';else header = 'text/plain';
            html = e.clipboardData.getData(header);
            if (header == 'text/plain') {
                var cleanDiv = document.createElement("div");
                cleanDiv.innerHTML = html;
                html = cleanDiv.textContent;
            }
        }
        var localHTML = html;
        // Удаляем переносы строк
        localHTML = localHTML.replace(/(\n(\r)?)/g, '');
        localHTML = localHTML.replace(/<strong.*?>/g, "<b>");
        localHTML = localHTML.replace(/<\/strong>/g, "</b>");
        localHTML = localHTML.replace(/<em.*?>/g, "<i>");
        localHTML = localHTML.replace(/<\/em>/g, "</i>");

        // удаляет все атрибуты у тегов
        localHTML = localHTML.replace(/(<(?!a|span)[a-z0-9]{1,}).*?>/g, "$1>");
        // удаляет все лишние теги
        localHTML = localHTML.replace(/((?!<a(?![a-z0-9]).*?|<span(?![a-z0-9]).*?|<h\d(?![a-z0-9]).*?>|<p(?![a-z0-9]).*?>|<b>|<i>|<style>)<[a-z0-9]{1,}.*?>)/g, "");
        localHTML = localHTML.replace(/(?!<\/a>)(?!<\/span>)(?!<\/h\d>)(?!<\/p>)(?!<\/b>)(?!<\/i>)(?!<\/style>)(<\/[a-z0-9]{1,}>)/g, "");

        localHTML = localHTML.replace(/<style.*?>.*?<\/style>/g, '');
        html = html.replace(/(\n(\r)?)/g, '');
        html = html.replace(/<style.*?>.*?<\/style>/g, '');
        localHTML = jQuery.trim(localHTML);

        //// оборачиваем все дочерние элементы в теги <p>
        //div.innerHTML = localHTML;
        //var ArrayP = jQuery(div).children(":not(p,:header)");
        //ArrayP.each(function () {
        //    jQuery(this).wrap(function(){
        //        return '<p />';
        //    });
        //});
        //localHTML = div.innerHTML;

        // находит текст, который не обернут в теги и так же их оборачивает
        var re = /(<(?:p|h\d)>.*?<\/(?:p|h\d)>)/;
        var ListP = localHTML.split(re);
        var elementArray = '';
        for (var i = 0; i < ListP.length; i++) {
            if (!ListP[i].match(/^<(?:p|h\d)>.*<\/(?:p|h\d)>/) && ListP[i].length > 0) {
                var p = document.createElement("p");
                p.innerHTML = ListP[i];
                ListP[i] = p.outerHTML;
            }
            elementArray += ListP[i];
        }
        localHTML = elementArray;

        // находит все спаны и ссылки и удаляет у них все лишнее
        div.innerHTML = localHTML;
        var ArraySpan = jQuery(div).find("span");
        var sel = this;

        ArraySpan.each(function (index, elem) {
            var spanColor, span;

            span = document.createElement("span");
            spanColor = jQuery(this).css("color");
            if (spanColor != undefined && spanColor.length != 0) {
                span.style.color = spanColor;
            }
            span.innerHTML = elem.innerHTML;
            var parentDiv = elem.parentNode;
            parentDiv.replaceChild(span, elem);
        });

        var ArrayA = jQuery(div).find("a");

        ArrayA.each(function (index, elem) {
            var elementHref, href;
            elementHref = document.createElement("a");
            href = jQuery(this).attr("href");
            elem.innerHTML = sel.probelPoKrayam(elem.innerHTML);
            if (href != undefined && href.length != 0) {
                elementHref.href = href;
            }
            elementHref.innerHTML = elem.innerHTML;
            var parentDiv = elem.parentNode;
            parentDiv.insertBefore(elementHref, elem);
            jQuery(elem).remove();
        });

        localHTML = div.innerHTML;
        localHTML = this.clearEmptyTeg('', localHTML);

        // Удаляем переносы строк
        localHTML = localHTML.replace(/(\n(\r)?)/g, '');
        this.insertSelection(localHTML);
        var parentHTML = jQuery(parentNodeStart).closest("p,:header").get(0).outerHTML;
        var tagNameParentNodeStart = jQuery(parentNodeStart).closest("p,:header").get(0).tagName.toLowerCase();
        var tagNameParentNodeStyle = jQuery(parentNodeStart).closest("p,:header").attr("style");
        //tagNameParentNodeStyle = tagNameParentNodeStyle.replace(/(\"|\')/,"\\'");
        //var styleTagName = tagNameParentNodeStyle ? "style = '" + tagNameParentNodeStyle + "'" : "";

        jQuery(parentNodeStart).closest("p,:header").remove();

        var textStart = parentHTML.match(/<(?:p|h\d).*?>(.*?)<(?:p|h\d)>/);
        var textEnd = parentHTML.match(/.*<\/(?:p|h\d)>(.*?)<\/(?:p|h\d)>$/);
        if (textStart) {
            // commented becouse if paste html(<p><p>Text</p></p>) return error
            //if (this.strip_tags(textStart[1]).length == 0) textStart[1] = '';
            localHTML = localHTML.replace(/^(<(?:p|h\d).*?>)/, "$1" + textStart[1]);
        }
        if (textEnd) {
            //if (this.strip_tags(textEnd[1]).length == 0) textEnd[1] = '';
            localHTML = localHTML.replace(/(<\/(?:p|h\d).*?>)$/, textEnd[1] + "$1");
        }

        localHTML = localHTML.replace(/<(?:p|h\d).*?>(.*?)<\/(?:p|h\d)>/, "$1");

        var element = document.createElement(tagNameParentNodeStart);
        // убирает вложенные одинаковые теги такого типа<i>ффывфв <i>asdasdsad</i>asdasdasdasdsd </i>
        element.innerHTML = this.clearNestingTeg(localHTML);
        element.style.cssText = tagNameParentNodeStyle;
        localHTML = element.outerHTML;

        div.innerHTML = localHTML;
        // потом заменить
        var clearEmptyTeg = jQuery(div).find("*");
        clearEmptyTeg.each(function (index, elem) {
            if (jQuery.trim(jQuery(this).text()) == "") {
                this.innerHTML = '';
            }
        });
        localHTML = div.innerHTML;

        this.insertSelection(localHTML);
        var parentNodeStartNew = range.startContainer.parentNode;
        if (parentNodeStartNew.tagName.toLowerCase() == 'div') parentNodeStartNew = range.startContainer;
        var testParentNodeStartNew = jQuery(parentNodeStartNew).closest("p,:header");

        this.clearEmptyTeg(jParent);
        window.getSelection().removeAllRanges();

        jParent = jQuery(parentNodeStartNew).closest("div");
        div = document.createElement("div");
        div.innerHTML = html;
        html = jQuery.trim(div.textContent);
        //this.selectText( jParent[0], html.replace(/(\n(\r)?)/g,''));
        this.restoreSelection();
        e.stopPropagation();
        e.preventDefault();
    },
    clearNestingTeg: function clearNestingTeg(html) {
        var element = document.createElement("div");
        element.innerHTML = html;
        jQuery(element).find("b > b,i > i,a > a").each(function () {
            this.outerHTML = this.innerHTML;
        });
        return element.innerHTML;
    },
    checkRestore: function checkRestore(range) {

        var parentNodeStart1 = range.startContainer.parentNode;
        var parentNodeEnd = range.endContainer.parentNode;
        var parentNodeStart = jQuery(parentNodeStart1).closest("p,h1,h2,h3,h4,h5,h6,div");

        var lengthSelect, htmlLength;
        var htmlSelection = this.htmlspecialchars(parentNodeStart[0].innerHTML);

        htmlSelection = htmlSelection.replace(/&nbsp;/g, " ");

        // есть ли закрывающие теги в строке
        //if (htmlSelection.match(/<\/.+?>$/)) {
        // вытаскиваем все начиная с последнего элемента
        while (htmlSelection.match(/<\/.+?>$/)) {
            // раньше стояло replace(/<\/.+?>$/,""), если будет глючить заменить
            htmlSelection = htmlSelection.replace(/(.*)<\/.+?>$/, "$1");
        }
        // раньше стояло .*<.+?>(.+?)$

        var innerParentNodeHtml = this.regEscape(parentNodeStart1.innerHTML);

        var nodeValue = range.startContainer.nodeValue;
        //var re = new RegExp(range.startContainer.nodeValue+"$");
        //innerParentNodeHtml = innerParentNodeHtml.replace(re,'');
        var nodeValue1 = nodeValue;
        nodeValue = this.regEscape(nodeValue);
        nodeValue = nodeValue.replace(/\s/g, "\s");
        var re = new RegExp(".*(" + nodeValue + ".*)$", "");
        //htmlLength = htmlSelection.replace(re, "$1");
        var m, resM;
        if ((m = re.exec(htmlSelection)) !== null) {
            if (m.index === re.lastIndex) {
                re.lastIndex++;
            }
            resM = m[1];
        } else {
            resM = nodeValue1;
        }
        if (resM && resM != null) htmlLength = resM;

        lengthSelect = this.strip_tags(htmlLength).length;
        return lengthSelect;
    },
    restoreSelection: function restoreSelection(flag, selection) {

        if (!this.selectionState) {
            return;
        }

        var editableElement = this.selectionState.elements[this.selectionState.editableElementIndex],
            charIndex = 0,
            range = document.createRange(),
            nodeStack = [editableElement],
            node,
            foundStart = false,
            stop = false,
            i,
            sel,
            nextCharIndex;

        range.setStart(editableElement, 0);
        range.collapse(true);
        node = nodeStack.pop();
        if (flag != undefined) {
            if (flag && flag != 3) this.selectionState.start = this.selectionState.start + 1;
            if (!flag && flag != 3) {
                this.selectionState.start = this.selectionState.start - 1;
            }
        }
        while (!stop && node) {
            if (node.nodeType === 3) {
                nextCharIndex = charIndex + node.length;
                if (!foundStart && this.selectionState.start >= charIndex && this.selectionState.start <= nextCharIndex) {

                    range.setStart(node, this.selectionState.start - charIndex);
                    foundStart = true;
                }
                if (foundStart && this.selectionState.end >= charIndex && this.selectionState.end <= nextCharIndex) {
                    range.setEnd(node, this.selectionState.end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                i = node.childNodes.length - 1;
                while (i >= 0) {
                    nodeStack.push(node.childNodes[i]);
                    i -= 1;
                }
            }
            if (!stop) {
                node = nodeStack.pop();
            }
        }

        var parentNodeStart1 = range.startContainer.parentNode;
        var parentNodeEnd = range.endContainer.parentNode;
        var parentNodeStart = jQuery(parentNodeStart1).closest("p,h1,h2,h3,h4,h5,h6,div");

        // asd a das asd
        var lengthSelect = this.checkRestore(range);

        if (lengthSelect == range.startOffset && range.startOffset > 0) {
            var mtB;
            var mt = parentNodeStart.next();

            if (mt && mt[0] != undefined) {

                mtB = this.strip_tags(mt[0].innerHTML);

                // почему то стандартный способ next("p,...") не работает
                var teg = mt[0].tagName.toLowerCase();
                while (mtB.length == 0 || teg != 'p' && teg != 'h1' && teg != 'h2' && teg != 'h3' && teg != 'h4' && teg != 'h5' && teg != 'h6') {
                    if (!mt.next().get(0)) break;
                    mt = mt.next();
                    teg = mt[0].tagName.toLowerCase();
                    mtB = this.strip_tags(mt[0].innerHTML);
                }

                range.setStart(mt[0], 0);
            }
        }

        sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },
    saveSelection: function saveSelection() {
        var selectionState = {};
        var elements = [];
        var self = this;
        var parentNodeStart;
        var selection = window.getSelection(),
            range,
            preSelectionRange,
            start,
            editableElementIndex = -1;

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            preSelectionRange = range.cloneRange();
            parentNodeStart = range.startContainer;
            while (parentNodeStart.tagName !== 'DIV') {
                parentNodeStart = parentNodeStart.parentNode;
            }
            elements = [parentNodeStart];
            elements.forEach(function (el, index) {
                if (el === range.startContainer || self.isDescendant(el, range.startContainer)) {
                    editableElementIndex = index;
                    return false;
                }
            });

            if (editableElementIndex > -1) {
                preSelectionRange.selectNodeContents(elements[editableElementIndex]);
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;
                this.selectionState = {
                    start: start,
                    end: start + range.toString().length,
                    editableElementIndex: editableElementIndex,
                    elements: elements
                };
            }
        }
    },
    // передается элемент в котором необходимо удалить все теги
    clearEmptyTeg: function clearEmptyTeg(div, html, dopTeg) {
        var tegsDop;
        if (html != undefined) {
            div = document.createElement('div');
            div.innerHTML = html;
            div = jQuery(div);
        }

        if (dopTeg != undefined) {

            var props = [];
            for (var i in dopTeg) {
                props[i] = dopTeg[i] + ":empty";
            }
            tegsDop = "," + props.join(', ');
        } else {
            tegsDop = '';
        }

        var cikl = true,
            selector;

        while (cikl) {
            cikl = false;
            selector = div.find("a:empty,span:empty,b:empty,i:empty,h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty,p:empty" + tegsDop);

            if (selector[0]) {

                selector.remove();
                cikl = true;
            }
        }
        if (div[0] && div[0] != undefined) return div[0].innerHTML;
    },

    searchParentTeg: function searchParentTeg(startContainer, teg) {
        var i = 0;
        startContainer = jQuery(startContainer);
        while (!startContainer.is("div") && i < 7) {
            if (startContainer.is(teg)) {
                if (startContainer.is("a")) return startContainer.attr('href');
                return true;
            }
            startContainer = startContainer.parent();
            i++;
        }
        return false;
    },
    strip_tags: function strip_tags(str) {

        if (str == undefined) return false;
        return str.replace(/<\/?[^>]+>/gi, '');
    },
    // написть норм функцию для преобразования html в сущности
    htmlspecialchars: function htmlspecialchars(str) {
        if (typeof str == "string") {
            str = str.replace(/&amp;/g, "&");
            str = str.replace(/&#039;/g, "'");
        }
        return str;
    },
    _getCurrentValues: function _getCurrentValues(sel) {
        this.saveSelection();

        var res = {},
            font = {};
        var selection = window.getSelection(),
            range,
            parentNode,
            $parentNodeEnd,
            parentNodeEnd,
            $parentNode,
            size = [],
            lineHeight = [],
            number;

        res.bold = false;
        res.italic = false;
        var html = this._getSelection();
        html = html.replace(/<u>/g, "<b>");
        html = html.replace(/<\/u>/g, "</b>");

        var testHTML = this.clearEmptyTeg('', html, ["br", "hr", "div"]);
        if (jQuery.trim(testHTML).length == 0) return false;

        var re = new RegExp("(^<" + this.bold + "><\/" + this.bold + ">|<i><\/i>)", 'g');
        html = html.replace(re, "");

        if (selection.rangeCount !== 0) {
            range = selection.getRangeAt(0);
            parentNode = range.startContainer.parentNode;
            parentNodeEnd = range.endContainer.parentNode;

            var startContaonerTagName = range.startContainer.tagName;
            if (parentNode.tagName.toLowerCase() == 'div' || startContaonerTagName != undefined) {
                parentNode = range.startContainer;
                var parentNodeHtml = parentNode.innerHTML;
                var parentNodeReg = parentNodeHtml.match(/^<.+?>.*<.+?>$/);
                var parentNode1;

                while (parentNodeReg && parentNodeReg[0] != undefined) {
                    parentNode1 = jQuery(parentNode).children();
                    parentNode = parentNode1[0];
                    parentNodeHtml = parentNode.innerHTML;
                    parentNodeReg = parentNodeHtml.match(/^<.+?>.*<.+?>$/);
                }
            }

            $parentNode = jQuery(parentNode);
            $parentNodeEnd = jQuery(parentNodeEnd);
            var MozillaBagSelection = this.trim(html);

            var div = document.createElement('div');
            div.innerHTML = MozillaBagSelection;
            jQuery(div).find("a,span,b,i").each(function () {
                if (jQuery.trim(jQuery(this).text()) == "") {
                    jQuery(this).remove();
                }
            });
            MozillaBagSelection = div.innerHTML;

            var parentStartB = $parentNode.closest("b,div");
            var parentEndB = $parentNodeEnd.closest("b,div");

            var parentStartI = $parentNode.closest("i,div");
            var parentEndI = $parentNodeEnd.closest("i,div");

            var parentStart = $parentNode.closest("p,h1,h2,h3,h4,h5,h6,div");
            var parentEnd = $parentNodeEnd.closest("p,h1,h2,h3,h4,h5,h6,div");
            var MozillaBagSelectionB, MozillaBagSelectionI;
            MozillaBagSelection = MozillaBagSelection.replace(/(<(?:p|h\d).*?>|<\/(?:p|h\d)>)/g, "");
            var re = new RegExp("^<i><" + this.bold + ">(.*)<\/" + this.bold + "><\/i>$", '');
            var reg1 = MozillaBagSelection.match(re);
            re = new RegExp("^<" + this.bold + "><i>(.*)<\/i><\/" + this.bold + ">$", '');
            var reg2 = MozillaBagSelection.match(re);
            re = new RegExp("(<" + this.bold + ">.*?<\/" + this.bold + ">)", 'g');
            MozillaBagSelectionB = this.strip_tags(MozillaBagSelection.replace(re, ""));
            MozillaBagSelectionI = this.strip_tags(MozillaBagSelection.replace(/(<i>.+?<\/i>|<em>.+?<\/em>)/g, ""));
            // если они находятся в разных <p> или <h>
            var i = 0,
                div,
                divB,
                divI,
                T,
                boldT,
                ItalicT,
                bCenter = true,
                iCenter = true;
            if (parentStart[0] != parentEnd[0]) {
                var divs = parentStart.nextUntil(parentEnd);
                while (divs[i] != undefined) {
                    div = divs[i];
                    divB = jQuery(div).find("b");
                    divI = jQuery(div).find("i");

                    T = this.strip_tags(div.innerHTML);
                    if (T.length == 0) {
                        i++;
                        continue;
                    }
                    boldT = this.strip_tags(divB.html());
                    ItalicT = this.strip_tags(divI.html());
                    if (T != boldT) {
                        bCenter = false;
                    }
                    if (T != ItalicT) {
                        iCenter = false;
                    }

                    i++;
                }
            }
            if (html.match(/<(.*)[^<>]*>\s*<\/(?:.*)[^<>]*>/) && html.match(/^<.+?>/)) {
                var ht = jQuery(html),
                    newHTML = '';
                ht.each(function () {
                    var k = this.textContent.length;
                    if (k != 0 && this.outerHTML != undefined) {
                        newHTML += this.outerHTML;
                    }
                });
                var search = newHTML.match(/^<(p|h\d|div)>/i);
                if (search) {
                    res.title = search[1];
                }
            }

            // убрал bCenter, т.к если выделить тройным кликом пердложение, то возвращает неверное значение http://joxi.ru/Dr8EZLPs3ZPlm6
            if (MozillaBagSelectionB.length == 0) {
                res.bold = true;
            }
            if (MozillaBagSelectionI.length == 0) {
                res.italic = true;
            }

            // если имеют общего родителя
            if (parentStartB[0] == parentEndB[0] && parentStartB[0].tagName.toLowerCase() == "b") {
                res.bold = true;
            }

            if (parentStartI[0] == parentEndI[0] && parentStartI[0].tagName.toLowerCase() == "i") {
                res.italic = true;
            }

            if ((MozillaBagSelection.indexOf("<" + this.bold + ">") == 0 && MozillaBagSelection.indexOf("</" + this.bold + ">") == MozillaBagSelection.length - 4 || reg1 && reg1[0] != undefined) && MozillaBagSelectionB.length == 0) {
                res.bold = true;
            }

            if ((MozillaBagSelection.indexOf("<i>") == 0 && MozillaBagSelection.indexOf("</i>") == MozillaBagSelection.length - 4 || reg2 && reg2[0] != undefined) && MozillaBagSelectionI.length == 0) {
                res.italic = true;
            }

            if (MozillaBagSelection.indexOf("<a") == 0 && MozillaBagSelection.indexOf("</a>") == MozillaBagSelection.length - 4) {
                res.link = jQuery(MozillaBagSelection).attr('href');
            }

            if (this.searchParentTeg(range.startContainer, 'b') && parentNode.innerHTML.indexOf(html) !== -1) {
                res.bold = true;
            }
            if (this.searchParentTeg(range.startContainer, 'i') && parentNode.innerHTML.indexOf(html) !== -1) {
                res.italic = true;
            }
            var boolS = this.searchParentTeg(range.startContainer, 'a');

            // убрал, т.к. если выделить текст, задать ему ссылку, потом с двух сторон поменять цвет, то при следующем выделении он не возвращает url
            if (boolS) {
                res.link = boolS;
            }
            var colorHTML;

            colorHTML = this.clearEmptyTeg('', html);
            var div = document.createElement("div");
            div.innerHTML = html;

            var htmlSearch = colorHTML;
            colorHTML = colorHTML.replace(/<span.*<\/span>/g, '');
            colorHTML = this.trim(this.strip_tags(colorHTML));
            if (colorHTML.length == 0) {
                this.clearEmptyTeg(jQuery(div));
                var span = jQuery(div).find("span");
                if (span && span[0] != undefined) res.color = this._rgb2hex(span.css('color'));
            } else {
                res.color = this._rgb2hex($parentNode.css('color'));
            }

            var cikl = true,
                selector;

            while (cikl) {
                cikl = false;
                selector = jQuery(div).find("a:empty,b:empty,i:empty,h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty,p:empty");

                if (selector[0]) {

                    selector.remove();
                    cikl = true;
                }
            }
            var searchEmptyColor = jQuery(div).find("span:empty");
            if (searchEmptyColor && searchEmptyColor[0] != undefined) {
                if (colorHTML.length == 0) {
                    this.clearEmptyTeg(jQuery(div));
                    var span = jQuery(div).find("span");
                    if (span && span[0] != undefined) res.color = this._rgb2hex(span.css('color'));
                } else {
                    //если выделить слово с последним пробелом, поставить цвет, потом болд, и следующему слову поставить болд, то _getCurren не верно возвращает значения
                    var $parentNode1 = $parentNodeEnd;
                    res.color = this._rgb2hex($parentNode1.css('color'));
                }
            }

            while (!$parentNode.is('p') && !$parentNode.is('h1') && !$parentNode.is('h2') && !$parentNode.is('h3') && !$parentNode.is('h4') && !$parentNode.is('h5') && !$parentNode.is('h6') && !$parentNode.is('div')) {
                parentNode = parentNode.parentNode;
                $parentNode = jQuery(parentNode);
            }

            var div = document.createElement('div');
            div.innerHTML = html;

            var cikl = true,
                selector;

            while (cikl) {
                cikl = false;
                selector = jQuery(div).find("a:empty,span:empty,b:empty,i:empty,h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty,p:empty,br");

                if (selector[0]) {

                    selector.remove();
                    cikl = true;
                }
            }

            jQuery(div).find("a:empty,span:empty,b:empty,i:empty,h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty,p:empty").remove();
            html = div.innerHTML;

            var $parentElem = $parentNode.closest("p,h1,h2,h3,h4,h5,h6,div"); // ищем близжайших родителей p или h
            var re = new RegExp("^<.+?>.+?<(h[1-6]|p|\/h[1-6]|\/p)>.+?<.+?>$", '');
            if (html.match(re)) {
                res.title = "";
            } else {

                if ($parentElem[0] == undefined || !$parentElem[0]) {
                    $parentElem = jQuery(range.startContainer);
                }

                res.title = $parentElem.get(0).tagName.toLowerCase();
            }

            // res.title - возвращает заголовок  p,h1,h2,h3,h4,h5,h6,div, пустое значение если выделенно несколько заголовков

            var className = $parentElem.attr("class");
            if (className) {
                size = className.match(/.*text-font-size-(.+?)(?:$| )/);
                lineHeight = className.match(/.*text-line-height-(.+?)(?:$| )/);
            }

            font.size = size && size[1] ? size[1] : $parentElem.css("font-size");
            font.height = lineHeight && lineHeight[1] ? lineHeight[1] : $parentElem.css("line-height");

            //var size = className.match(/.*text-font-size-(.+?)(?:$| )/);

            font.family = $parentElem.css("font-family");
            //font.size = size[1];
            font.align = $parentElem.css("text-align");
            number = parseInt(font.size.replace("px", ''), 10);
            font.size = Math.round(number) + "px";
            //font.height = lineHeight[1].replace("-",".");
            font.spacing = $parentElem.css("letter-spacing");
            res.font = font;
        }

        if (this.ua.search(/Trident/) > 0) this.restoreSelection();

        return res;
    },

    _makeText: function _makeText(type) {
        if (this._getSelection().length == 0) return false;
        document.execCommand(type);
    },
    pasteHtmlAtCaret: function pasteHtmlAtCaret(html) {
        var sel, range;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(),
                    node,
                    lastNode;
                while (node = el.firstChild) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
        }
    },

    createLink: function createLink(url) {
        var selection, range, $parentNodeStart, htmlHTML, html, $parentNode, urlHtml, start, end, htmlNew;

        this.restoreSelection();
        this.saveSelection();
        if (this._getSelection().length == 0) return false;
        html = this._getSelection();
        selection = window.getSelection();
        range = selection.getRangeAt(0);
        $parentNodeStart = jQuery(range.startContainer.parentNode);
        var $parentNodeEnd = jQuery(range.endContainer.parentNode);
        var parentTot = $parentNodeStart.closest("p,h1,h2,h3,h4,h5,h6,div");

        if (url.length < 1) {

            if (html.match(/<a.+?>(.*)<\/a>/)) {
                document.execCommand('unlink', false, false);
            } else {

                // было раньше htmlHTML = $parentNodeStart[0].outerHTML;
                // если в ссылке ссылке находится болд, то <a> не убирается
                if ($parentNodeStart.closest("a")) {
                    htmlHTML = $parentNodeStart.closest("a").get(0).outerHTML;
                    htmlHTML = htmlHTML.replace(/<a.+?>(.*)<\/a>/, "$1");
                    $parentNodeStart.closest("a").get(0).outerHTML = htmlHTML;
                }
            }
        } else {
            var href;

            var searchP = html.match(/<p>|<h\d>/);

            if (searchP) {
                document.execCommand('createlink', false, url);
                var parentKos = $parentNodeEnd.closest("p,h1,h2,h3,h4,h5,h6,div");

                this.linkUnite(parentKos);
            } else {
                var urlInUrlStart = $parentNodeStart.closest("a");
                var urlInUrlEnd = $parentNodeEnd.closest("a");
                // если указанна ссылка в ссылке, то для родительской ссылки меняется url
                if (urlInUrlStart && urlInUrlStart[0] != undefined && urlInUrlStart[0] == urlInUrlEnd[0]) {
                    href = html.replace(/<a.+?>|<\/a>/g, '');
                } else {

                    var htmlTest = html.replace(/<a.+?>|<\/a>/g, '');
                    href = "<a href='" + url + "'>" + htmlTest + "</a>";
                }

                this.pasteHtmlAtCaret(href);
                if (urlInUrlStart && urlInUrlStart[0] != undefined && urlInUrlStart[0] == urlInUrlEnd[0]) {
                    urlInUrlStart.attr("href", url);
                }
            }

            var parentTeg = jQuery(range.startContainer).closest("p,h1,h2,h3,h4,h5,h6,div");

            // добавленно условие для https://bitbucket.org/themefuse/blox-builder-concept/issues/745/i-add-link-but-in-my-case-it-is-added-and
            var styleColor = jQuery(range.startContainer).closest("span[style*='color']");
            if (!styleColor) {
                this.linkUnite(parentTot);
            }
            html = html.replace(/<a.+?>/g, "");
            html = html.replace(/<\/a>/g, "");

            html = this.strip_tags(html);
            var html1 = this.trim(html);
            $parentNode = parentTeg.find('a[href="' + url + '"]').filter(function () {
                var re = new RegExp(html1, 'i');
                return re.test($(this).text());
            });
            if ($parentNode[0] && $parentNode[0] != undefined) {
                var textContent = $parentNode[0].textContent;

                start = textContent.match(/(^\s*)/);
                end = textContent.match(/(\s*)$/);
                var div = document.createElement("a");
                var inHtml = $parentNode[0].outerHTML;
                inHtml = inHtml.replace(/((?:&nbsp;){1})/g, "");
                // убрал, т.к если выделить слово, добавить ему ссылку, потом поменять цвет, и выделить часть ссылки и часть другого слова, то исчезает пробел между ними
                //inHtml = inHtml.replace(/>([ ]{1,})/g, ">");
                inHtml = inHtml.replace(/([ ]{1,})</g, "<");
                inHtml = inHtml.replace(/<a.+?>|<\/a>/g, '');

                if (start && start[1] != undefined && start[1].length != 0) {
                    $parentNode.before(start[1]);
                    $parentNode[0].innerHTML = inHtml;
                }
                if (end && end[1] != undefined && end[1].length != 0) {
                    $parentNode.after(end[1]);
                    $parentNode[0].innerHTML = inHtml;
                }
            }
        }

        this.restoreSelection();
        this._changePosition();
    },
    mozilaEditBold: function mozilaEditBold(parentStart, html) {
        var htmlCenter, re;
        var htmlTest = html;
        htmlCenter = parentStart[0].outerHTML;
        if (html.match(/<a/)) {
            html = html.replace(/^<.+?>/i, ''); // обрезает теги по краям
            html = html.replace(/<\/.+?>$/i, ''); // обрезает теги по краям
            re = new RegExp("<" + this.bold + ">", 'g');
            html = html.replace(re, '');
            re = new RegExp("<\/" + this.bold + ">", 'g');
            html = html.replace(re, '');
            html = html.replace(/(<(?:a).*?>)/, "</b>$1<b>");
            html = html.replace(/(<\/(?:a)>)/, "</b>$1");
            htmlTest = htmlTest.replace(/^<.+?>/i, ''); // обрезает теги по краям
            htmlTest = htmlTest.replace(/<\/.+?>$/i, ''); // обрезает теги по краям
            htmlCenter = htmlCenter.replace(htmlTest, "<" + this.bold + ">" + html + "</" + this.bold + ">");
            parentStart[0].outerHTML = htmlCenter;
        } else {
            re = new RegExp("<" + this.bold + ">", 'g');
            html = html.replace(re, '');
            re = new RegExp("<\/" + this.bold + ">", 'g');
            html = html.replace(re, '');
            htmlCenter = htmlCenter.replace(htmlTest, "<" + this.bold + ">" + html + "</" + this.bold + ">");
            parentStart[0].outerHTML = htmlCenter;
        }

        parentStart.find("a:empty,b:empty,i:empty,span:empty").remove();
    },
    clearTeg: function clearTeg($parentNode) {
        var sel = this;
        var div = $parentNode.closest("div");
        var childParagraf = div.find("p,:header");
        childParagraf.each(function () {

            var inHtml = sel.clearEmptyTeg(jQuery(this));

            inHtml = inHtml.replace("</b><b>", "");
            inHtml = inHtml.replace("<b><b>", "<b>");
            inHtml = inHtml.replace("</b></b>", "</b>");
            this.innerHTML = inHtml;
        });
    },
    clearAtributeChrome: function clearAtributeChrome() {
        // если для темы проставленно предполжим font-weight:bold, то если выделенному тексту поставить <i> и <b>, тогда появляется такого рода теги <i style = "font-weight:normal">, эта функция из убирает
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var parentNode = range.startContainer.parentNode;
        var $parentNode = jQuery(parentNode).closest("p,:header,div");
        $parentNode.find("b[style],i[style]").each(function () {
            jQuery(this).removeAttr("style");
        });
    },
    setBold: function setBold() {
        var ua = this.ua,
            sel = this;
        if (ua.search(/Trident/) > 0 || ua.search(/Safari/) > 0 && !window.external) {
            this.restoreSelection();
        }

        // если убрать то если выделить таким образом http://joxi.ru/Y2L0MGQfYEEp26 то болд не ставится и выделение пропадает
        //this.restoreSelection();

        this.saveSelection();

        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var parentNode = range.startContainer.parentNode;
        var $parentNode = jQuery(parentNode).closest("div");

        var title = this._getCurrentValues();

        if ((ua.search(/Firefox/) > 0 || ua.search(/Trident/) > 0 || ua.search(/Chrome/) > 0) && (title.title == '' || title.title == 'h1' || title.title == 'h2' || title.title == 'h3' || title.title == 'h4' || title.title == 'h5' || title.title == 'h6') && !title.bold) {

            document.execCommand('bold', false, null);

            document.execCommand('underline', false, null);
            $parentNode.find("u").replaceWith(function (index, oldHTML) {
                return $("<b>").html(oldHTML);
            });

            $parentNode.find("b").children("b").replaceWith(function (index, oldHTML) {

                this.outerHTML = this.innerHTML;

                return $("<b>").html(oldHTML);
            });

            this.restoreSelection();

            // Удаляет всякий мусор, который остается ввиде <i></i>  <b></b>
            this.clearTeg($parentNode);

            var div = $parentNode.closest("div");

            var teg, tegB;
            div.find("b").each(function (index) {
                teg = jQuery(this).parent("b,div");
                if (teg.is("b")) {
                    tegB = this.outerHTML;
                    tegB = tegB.replace(/<b>/g, "");
                    tegB = tegB.replace(/<\/b>/g, "");
                    this.outerHTML = tegB;
                }
            });
            this.restoreSelection();
            this._changePosition();
        } else {
            document.execCommand('bold', false, null);
        }

        if (ua.search(/Trident/) > 0) {

            $parentNode.find("strong").replaceWith(function (index, oldHTML) {
                return $("<b>").html(oldHTML);
            });
        }
        var div = $parentNode.closest("div");
        div = $parentNode.closest("div");
        var findSpan = div.find("span[style*='font-weight']");
        findSpan.each(function () {
            jQuery(this).css({ "font-weight": "" });
        });
        // Убрал т.к Выделить часть предложения и поставить цвет.Перед этим цветом выделить слово и поставить болд
        //div = $parentNode.closest("div");
        //var childParagraf = div.find("p,:header");
        //childParagraf.each(function () {
        //    var inHtml = this.innerHTML;
        //    this.innerHTML = inHtml.replace(/<span>|<\/span>/g, "");
        //});

        // Добавленно, удаляет span , которые не несут с собой никакой смысловой нагрузки
        div = $parentNode.closest("div");
        var childParagraf = div.find("span");
        childParagraf.each(function () {
            if (!jQuery(this).css("color")) {
                this.outerHTML = this.innerHTML;
            }
        });

        this.linkUnite($parentNode);

        if (ua.search(/Safari/) < 1) this.restoreSelection();

        if (ua.search(/Safari/) != -1 || ua.search(/Trident/) > 0) {

            this._changePosition();
        }

        this.clearAtributeChrome();
    },

    setItalic: function setItalic() {
        if (this.ua.search(/Safari/) > 0 || this.ua.search(/Trident/) > 0) {

            this.restoreSelection();
        }

        this._makeText('italic');
        if (this.ua.search(/Safari/) > 0 || this.ua.search(/Trident/) > 0) {

            this._changePosition();
        }

        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var parentNode = range.startContainer.parentNode;
        var $parentNode = jQuery(parentNode).closest("div");
        if (this.ua.search(/Trident/) > 0) {

            $parentNode.find("em").replaceWith(function (index, oldHTML) {
                return $("<i>").html(oldHTML);
            });
        }
        if (this.ua.search(/Trident/) > 0) {

            this.restoreSelection();
        }

        this.clearAtributeChrome();
    },

    setUnderline: function setUnderline() {

        this._makeText('underline');
    },
    trim: function trim(str) {
        return str.replace(/^((?:\s{1,}|&nbsp;{1,}){1,})/, '').replace(/((?: {1,}|&nbsp;{1,}){1,})*$/, '');
    },
    setTitle: function setTitle(title, return_r) {

        if (this.ua.search(/Safari/) > 0 || this.ua.search(/Trident/) > 0) {

            this.restoreSelection();
        }

        if (title.length == 0) title = "p";
        if (this._getSelection().length == 0) return false;
        var k, kostili, kostiliHtml, $parentNodeStart, $parentNodeEnd, selectedText, parentNodeStart, parentNodeEnd, rang, $parentStartB, replace1, replace2, htmlReplaceTegCenter, $parentEndB, htmlMatchCenter, ua;
        if (window.getSelection) {
            selectedText = window.getSelection();
        } else if (document.getSelection) {
            selectedText = document.getSelection();
        } else if (document.selection) {
            selectedText = document.selection.createRange();
        }
        rang = selectedText.getRangeAt(0);
        parentNodeStart = rang.startContainer.parentNode;

        if (parentNodeStart.tagName.toLowerCase() == 'div') parentNodeStart = rang.startContainer;

        $parentNodeStart = jQuery(parentNodeStart);
        parentNodeEnd = rang.endContainer.parentNode;
        $parentNodeEnd = jQuery(parentNodeEnd);
        html = this._getSelection();

        ua = this.ua;
        k = html.match(/^<a.+?>(.+?)<\/a>$/);
        if (ua.search(/Firefox/) > 0 && k && !k[1].match(/<.+?>/)) {
            this.insertSelection(html);
        }

        if (ua.search(/Firefox/) > 0) {
            parentNodeStart = rang.startContainer;
            parentNodeEnd = rang.endContainer;
            $parentNodeStart = jQuery(parentNodeStart);
            $parentNodeEnd = jQuery(parentNodeEnd);
        }

        $parentStartB = $parentNodeStart.closest("p,h1,h2,h3,h4,h5,h6,div"); // ищем близжайших родителей b
        $parentEndB = $parentNodeEnd.closest("p,h1,h2,h3,h4,h5,h6,div"); // ищем близжайших родителей b

        var htmlparentStartB = $parentStartB.get(0).outerHTML;

        var htmlparentEndB = $parentEndB.get(0).outerHTML;
        var tagNamesEnd = $parentNodeEnd[0].tagName;
        var tagNamesStart = $parentNodeStart[0].tagName;

        var html = this._getSelection();

        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        range.deleteContents();

        if (tagNamesEnd !== undefined && tagNamesStart !== undefined && (tagNamesStart.toLowerCase() == 'div' || tagNamesEnd.toLowerCase() == 'div')) {
            replace1 = htmlparentStartB.replace(/<(p|h\d)/g, "<" + title);
            replace1 = replace1.replace(/<(\/p|\/h\d)>/g, "</" + title + ">");
            $parentStartB[0].outerHTML = replace1;
        } else {
            if ($parentStartB[0] != $parentEndB[0]) {
                var i = 0;

                html = html.replace(/^<(.*?)>(.*)<(.*?)>$/gi, '$2'); // обрезает теги по краям

                htmlMatchCenter = html.match(/^.+?<\/(?:p|h[1-6])+?>(.*)<(?:p|h[1-6]).*?>.+?$/);

                if (htmlMatchCenter) {
                    htmlReplaceTegCenter = htmlMatchCenter[1];
                } else {
                    htmlReplaceTegCenter = '';
                }
                htmlReplaceTegCenter = htmlReplaceTegCenter.replace(/<(p|h\d)/g, "<" + title);
                htmlReplaceTegCenter = htmlReplaceTegCenter.replace(/<(\/p|\/h\d)/g, "<\/" + title);

                replace1 = htmlparentStartB.replace(/<(p|h\d)/g, "<" + title);
                replace1 = replace1.replace(/<(\/p|\/h\d)>/g, "<\/" + title + ">");

                replace2 = htmlparentEndB.replace(/<(p|h\d)/g, "<" + title);
                replace2 = replace2.replace(/<(\/p|\/h\d)>/g, "<\/" + title + ">");

                $parentStartB[0].outerHTML = replace1 + htmlReplaceTegCenter;
                $parentEndB[0].outerHTML = replace2;
            } else {
                replace1 = htmlparentStartB.replace(/<(?:p|h\d)(.*?)>/g, "<" + title + " $1>");
                replace1 = replace1.replace(/<(\/p|\/h\d)>/g, "</" + title + ">");

                $parentStartB[0].outerHTML = replace1;
            }
        }

        this.restoreSelection();

        //if (this.ua.search(/Safari/) > 0) {
        //
        //    this._changePosition();
        //}

        return title;
    },
    insertSelection: function insertSelection(html) {
        var sel = window.getSelection();
        var range = window.getSelection().getRangeAt(0);
        range.deleteContents();
        var fragment = range.createContextualFragment(html);
        var firstInsertedNode = fragment.firstChild;
        var lastInsertedNode = fragment.lastChild;
        range.insertNode(fragment);
        if (firstInsertedNode) {
            range.setStartBefore(firstInsertedNode);
            range.setEndAfter(lastInsertedNode);
        }
        sel.removeAllRanges();
        sel.addRange(range);
    },
    BackSpaceDown: function BackSpaceDown(e) {

        if (!this.isEmptyArea()) return false;

        if (this.ua.search(/Safari/)) {

            var range = window.getSelection().getRangeAt(0);

            var parentNode = range.startContainer.parentNode;
            if (parentNode.tagName.toLowerCase() == 'div') parentNode = range.startContainer;
            var parentNodeP = jQuery(parentNode).closest("p,h1,h2,h3,h4,h5,h6,div");
            var PrevParentNodeP = parentNodeP.prev();

            var lengthParent1 = this.strip_tags(PrevParentNodeP.html()).length;

            if (jQuery(parentNode).closest("div").text().length === 0) {
                e.preventDefault();
                e.stopPropagation();
            }

            var param;

            // если перед элементом есть предыдущий элемент
            if (PrevParentNodeP[0] && PrevParentNodeP[0] != undefined) {
                var lengthParent = PrevParentNodeP[0].childNodes[PrevParentNodeP[0].childNodes.length - 1].textContent.length;
                var countChild = PrevParentNodeP[0].childNodes.length - 1;
                var textCont = PrevParentNodeP.get(0).textContent;
                var LengthTextCont = textCont.length;
                var htmlPrev = PrevParentNodeP[0].innerHTML;
                // если перед элементом пустой тег
                if (lengthParent == 0 && range.startOffset == 0 && range.endOffset == 0) {
                    PrevParentNodeP.remove();
                    e.preventDefault();
                }

                // если перед элементом не пустой тег, происходит слияние
                if (lengthParent != 0 && range.startOffset == 0 && range.endOffset == 0) {

                    var d = document.createElement("div");
                    d.innerHTML = parentNodeP.html();
                    var lPrevParentNodeP = this.strip_tags(parentNodeP[0].innerHTML);
                    if (lPrevParentNodeP.length != 0) {
                        PrevParentNodeP[0].innerHTML = PrevParentNodeP[0].innerHTML + d.innerHTML;
                    }

                    parentNodeP.remove();
                    var sel = document.getSelection();

                    if (htmlPrev.match(/<.+?>$/)) {

                        range.setStartAfter(PrevParentNodeP[0].childNodes[countChild]);
                        range.setEndAfter(PrevParentNodeP[0].childNodes[countChild]);
                        range.collapse(true);
                    } else if (htmlPrev.match(/<.+?>/)) {
                        range.setStart(PrevParentNodeP[0].childNodes[PrevParentNodeP[0].childNodes.length - 1], lengthParent);
                        range.setEnd(PrevParentNodeP[0].childNodes[PrevParentNodeP[0].childNodes.length - 1], lengthParent);
                    } else {
                        range.setStart(PrevParentNodeP[0].childNodes[0], lengthParent);
                        range.setEnd(PrevParentNodeP[0].childNodes[0], lengthParent);
                    }

                    sel.removeAllRanges();
                    sel.addRange(range);
                    e.preventDefault();
                }
            }
        }
    },
    range: function range() {
        try {
            return window.getSelection().getRangeAt(0);
        } catch (err) {
            return null;
        }
    },
    setBackSpace: function setBackSpace() {
        var range = this.range();
        if (!range) return;
        var parentNode = range.startContainer.parentNode;
        if (parentNode.tagName.toLowerCase() == 'div') parentNode = range.startContainer;
        var parentNodeP = jQuery(parentNode).closest("p,h1,h2,h3,h4,h5,h6,div");
        //debugger;
        //*[style*='font-family']" || "*[style*='font-size']" removed
        var childNode = parentNodeP.find("*[style*='background']");
        childNode.each(function () {
            if (jQuery(this).hasClass("colorPicker")) {
                var color = jQuery(this).css("color");
                jQuery(this).removeAttr("style");
                jQuery(this).css({ color: color });
            } else {
                //this.outerHTML = this.innerHTML;
                jQuery(this).removeAttr("style");
            }
        });
    },
    isEmptyArea: function isEmptyArea() {
        var div,
            localHTML,
            localText = "";
        localHTML = this._getSelection();
        div = document.createElement("div");
        div.innerHTML = localHTML;
        var clearEmptyTeg = jQuery(div).find("*");
        clearEmptyTeg.each(function (index, elem) {
            localText += jQuery.trim(jQuery(this).text());
        });
        // решает этот баг https://bitbucket.org/themefuse/blox-builder-concept/issues/736/this-kind-of-selection-edit-is-not-workign
        if (localHTML.length > 0 && localText.length == 0) return false;else return true;
    },
    deleteDown: function deleteDown(e) {

        if (!this.isEmptyArea()) return false;

        if (this.ua.search(/Safari/) > 0) {

            var range = window.getSelection().getRangeAt(0);
            var parentNode = range.startContainer.parentNode;
            if (parentNode.tagName.toLowerCase() == 'div') parentNode = range.startContainer;
            var parentNodeP = jQuery(parentNode).closest("p,h1,h2,h3,h4,h5,h6,div");
            var PrevParentNodeP = parentNodeP.next();
            var lengthParent = this.checkRestore(range);
            if (!lengthParent) lengthParent = 1;
            // если перед элементом есть предыдущий элемент
            if (PrevParentNodeP[0] && PrevParentNodeP[0] != undefined) {
                var textCont = PrevParentNodeP.get(0).textContent;
                var LengthTextCont = textCont.length;

                if (parentNodeP[0].textContent.length == 0) {
                    // если предыдущий тег пустой - например <p><br></p>, то удаляем его
                    range = document.createRange();
                    range.setStartBefore(parentNodeP.next().get(0));
                    range.collapse(true);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    parentNodeP.remove();
                    e.preventDefault();
                } else if (lengthParent == range.startOffset && LengthTextCont == 0) {
                    // если перед элементом пустой тег
                    PrevParentNodeP.remove();
                    e.preventDefault();
                } else if (LengthTextCont > 0 && lengthParent == range.startOffset) {
                    // если перед элементом не пустой тег, происходит слияние
                    var d = document.createElement("div");
                    d.innerHTML = PrevParentNodeP.html();
                    if (jQuery.trim(parentNodeP.get(0).textContent).length == 0) {
                        parentNodeP.remove();
                    } else {
                        parentNodeP[0].innerHTML = parentNodeP[0].innerHTML + d.innerHTML;
                        PrevParentNodeP.remove();
                    }

                    this.restoreSelection();
                    e.preventDefault();
                }
            }
        }
    },
    removeStyleEmptyTeg: function removeStyleEmptyTeg() {

        var parentNode, parentNodeP;
        var range = window.getSelection().getRangeAt(0);
        parentNode = range.startContainer.parentNode;
        var parentDiv = jQuery(parentNode).closest("div");
        var searchDiv = parentDiv.find(":header > br,p > br");
        searchDiv.each(function () {
            var parent = jQuery(this).parent();
            parent.removeAttr("style");
        });
    },
    setkeyUpEnter: function setkeyUpEnter(e) {

        if (this.ua.search(/Safari/) > 0) {

            var parentNode, parentNodeP;
            var range = document.getSelection().getRangeAt(0);

            var lengthSelect = this.checkRestore(range);

            parentNode = range.startContainer.parentNode;
            if (parentNode.tagName.toLowerCase() == 'div') parentNode = range.startContainer;
            parentNodeP = jQuery(parentNode).closest("p,h1,h2,h3,h4,h5,h6,div");

            if (parentNodeP[0].tagName.toLowerCase() == 'div') {
                parentNode = range.startContainer;
                parentNodeP = jQuery(parentNode).closest("p,h1,h2,h3,h4,h5,h6,div");
            }

            // убрал  || range.startContainer.length === undefined, т.к http://joxi.ru/BA0vjDGuxbXNmy, если надать backspace и enter, то курсор перемещается
            if (lengthSelect == range.startOffset && range.startOffset > 0) {
                parentNodeP.after("<p><br></p>");
                range = document.createRange();
                range.setStartAfter(parentNodeP.next().children().get(0));
                range.collapse(true);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                e.preventDefault();
            }
            if (range.startOffset == 0 && range.endOffset == 0) {
                // http://joxi.ru/VrwlX0zuK5Zd1m
                if (parentNodeP[0].tagName.toLowerCase() == 'div') {
                    parentNodeP.prepend("<p><br></p>");
                } else {
                    parentNodeP.before("<p><br></p>");
                }
                e.preventDefault();
            }
        }
    },
    setColor: function setColor(hex) {

        this.restoreSelection();

        if (this._getSelection().length == 0) return false;

        var $parentNodeStart, $parentNodeEnd, selectedText, html, parentNodeStart, parentNodeEnd, rang, range, style, resultSearch, paragrafStart, paragrafEnd, htmlCenter, resultSearchSpan, fragment, sel, firstInsertedNode, lastInsertedNode, div;
        if (window.getSelection) {
            selectedText = window.getSelection();
        } else if (document.getSelection) {
            selectedText = document.getSelection();
        } else if (document.selection) {
            selectedText = document.selection.createRange();
        }
        rang = selectedText.getRangeAt(0);
        style = "style='color:" + hex + "'";
        html = this._getSelection();

        // удаляет все span элементы.Добавлено, т.к образуется вложенность <span><span>...</span></span>
        html = html.replace(/<span.+?>|<\/span>/g, '');

        html = this.clearEmptyTeg('', html);
        html = this.htmlspecialchars(html);
        range = window.getSelection().getRangeAt(0);
        parentNodeStart = rang.startContainer.parentNode;
        parentNodeEnd = rang.endContainer.parentNode;

        // если этого условия не будет, то если выделить 2 блока http://joxi.ru/ZrJyJgkCynERAj и задать им цвет, то выходит шняга
        if (parentNodeStart.tagName.toLowerCase() == 'div') {
            parentNodeStart = rang.startContainer;
        }
        // добавленно div в конец.Иначе если в начале предложения выделить слово, потом поставить ему ссылку, и менять цвет,  - станет пустым
        $parentNodeStart = jQuery(parentNodeStart).closest("p,h1,h2,h3,h4,h5,h6,div");
        $parentNodeEnd = jQuery(parentNodeEnd).closest("p,h1,h2,h3,h4,h5,h6,div");
        this.clearEmptyTeg($parentNodeStart);
        this.clearEmptyTeg($parentNodeEnd);
        var parentTot = $parentNodeStart.closest("div");

        // проверка на случай если в начале предложения текст сначала выделили болд, потом поставили ему ссылку, и ставят цвет
        if ($parentNodeStart[0] && $parentNodeStart[0].tagName.toLowerCase() != 'div') {
            var parentStartHTml = $parentNodeStart[0].textContent;
            // добавлена проверка на то что выделенно первое слово или все предложение(parentStartHTml != html), если убрать то при тройном клике, если поставить болд, потом цвет , то в тегах <b> содеражатся еще теги <b>
            if (parentStartHTml != html && parentStartHTml.indexOf(this.strip_tags(html)) == 0 && parentNodeStart == parentNodeEnd && (parentNodeStart.tagName == 'A' || parentNodeStart.tagName == 'B' || parentNodeStart.tagName == 'I')) {

                // измененно на html1, т.к если у заголовка который в болд в начале текста выделить слово и изменить у него цвет, тогда текст дублируется
                var html1 = parentNodeStart.outerHTML;
                var i = 0,
                    tegParent = jQuery(parentNodeStart).parent();
                while (this.strip_tags(tegParent[0].innerHTML) == this.strip_tags(html1)) {
                    html1 = tegParent[0].outerHTML;
                    tegParent = tegParent.parent();
                }
            }
        }

        html = html.replace(/<(p.*?|h\d.*?)>(.*)<(\/p|\/h\d)>/gi, '$2');
        html = html.replace(/<\/?span[^>]+>|<\/span?[^>]+>/gi, '');
        resultSearch = html.match(/<p.*?>|<\/p>|<h\d.*?>|<\/h\d.*?>/);

        var searchHrefStart = $parentNodeStart.closest("a,div");
        var searchHrefEnd = $parentNodeEnd.closest("a,div");

        range.deleteContents();
        if (resultSearch) {

            // из -за этой регулярки если выделить 2 блока, потом поставить h4, потом болд, и потом поменять цвет, то выходила шняга
            //paragrafStart = html.replace(/(.*?)<(\/p|\/h\d|br)><(p.*?|h\d.*?|br)>.*/, "$1");

            // /(.*?)<(\/p|\/h\d|br)>.*/ -раньше было так.Убрал <br>, т.к если в параграфе встречался br , то обрезалось половина содержимого текста
            paragrafStart = html.replace(/(.*?)<(\/p|\/h\d)>.*/, "$1");
            paragrafEnd = html.replace(/^.*<(p.*?|h\d.*?)>(.*?)$/, "$2");
            // ["br","hr","div"] - раньше было так.убрал br.Смотри выше
            paragrafStart = this.clearEmptyTeg('', paragrafStart, ["hr", "div"]);
            paragrafEnd = this.clearEmptyTeg('', paragrafEnd, ["hr", "div"]);
            htmlCenter = html.replace(/^.*?<(\/p|\/h\d)>(.*)<(p.*?|h\d.*?)>.*/, "$2"); // проверить
            resultSearchSpan = html.match(/^<span.*?colorPicker.*?>.*<\/span>$/);
            if (resultSearchSpan) {
                paragrafStart = paragrafStart.replace(/<(.*?)colorPicker.*?style=("|')color:#(.*?)("|')>/gi, '<$1colorPicker" ' + style + ">");
                paragrafEnd = paragrafEnd.replace(/<(.*?)colorPicker.*?style=("|')color:#(.*?)("|')>/gi, '<$1colorPicker" ' + style + ">");
                $parentNodeStart.append(paragrafStart);
                $parentNodeEnd.prepend(paragrafEnd);
            } else {
                $parentNodeStart.append("<span class='colorPicker' " + style + ">" + paragrafStart + "</span>");
                $parentNodeEnd.prepend("<span class='colorPicker' " + style + ">" + paragrafEnd + "</span>");
            }
            //если есть вложенность тогда, вложенным тегам задаем color
            if (htmlCenter) {
                div = document.createElement("div");
                div.innerHTML = htmlCenter;
                jQuery(div).find("p, :header, span").each(function () {
                    jQuery(this).css({ "color": hex });
                });
                htmlCenter = div.innerHTML;
                $parentNodeStart.after(htmlCenter);
            }
        } else {

            sel = window.getSelection();

            var replaceColor = "<span class='colorPicker' " + style + ">" + html + "</span>";
            fragment = range.createContextualFragment(replaceColor);
            firstInsertedNode = fragment.firstChild;
            lastInsertedNode = fragment.lastChild;
            range.insertNode(fragment);
            if (firstInsertedNode) {
                range.setStartBefore(firstInsertedNode);
                range.setEndAfter(lastInsertedNode);
            }
            //стояла в начале.переставил туда, т.к из - за нее если выделить тройным кликом предложение и поменять ему цвет, то <p> заменяется <span>
            var div = $parentNodeStart.closest("p,h1,h2,h3,h4,h5,h6,div");
            this.clearEmptyTeg(div);

            sel.removeAllRanges();
            sel.addRange(range);
        }

        this.clearEmptyTeg(parentTot);
        this.linkUnite(parentTot);

        if (this.ua.search(/Firefox/) > 0) {
            this.restoreSelection();
        }

        this.removeStyleEmptyTeg();
    },
    // все прямые родители ссылок становятся детьми
    linkParent: function linkParent(href) {
        var sel = this;

        // все прямые родители ссылок становятся детьми
        href.each(function (index, element) {

            var emptyHref = sel.strip_tags(this.textContent);
            if (emptyHref.length != 0) {

                var i = 0;
                var jParent = jQuery(this).parent();

                var jParentHtml = sel.strip_tags(jParent[0].innerHTML);

                var jTek = jQuery(this);
                var nameTagP = jParent.closest("p,h1,h2,h3,h4,h5,h6");
                var nameTagJ = jTek[0].tagName.toLowerCase();
                var htmlMt = nameTagP[0].outerHTML;
                var re = new RegExp("(<a.*?<\/a>)", 'g');
                htmlMt = sel.strip_tags(htmlMt.replace(re, ""));

                // раньше было так.Если  в мозиле выделить ссылку, поставить ей болд, потом поменять цвет, потом снять болд и вновь поставить, то цвет теряется
                var jTekHtml = sel.strip_tags(this.innerHTML);

                // если у ссылки выделить 2 половину одним цветом, потом первую половину выделить другим, то у 2 половины цвет меняется

                var jTekHtml1 = this.innerHTML;

                if (jQuery(this).closest("b,div").get(0).tagName.toLowerCase() == 'b') this.innerHTML = jTekHtml1.replace("<b>|<\/b>", '');
                if (jQuery(this).closest("i,div").get(0).tagName.toLowerCase() == 'i') this.innerHTML = jTekHtml1.replace("<i>|<\/i>", '');

                var html,
                    element_tek = jParent,
                    element_tekTwo = jTek,
                    proverka_pr,
                    proverka_res,
                    proverka_b = '';

                while (jParentHtml == jTekHtml) {

                    // если убрать нижние 2 строки, то если выделить строку, задать ей ссылку, потом поменять цвет, то цвет не меняется

                    // если задать ссылку и поменять ссылке цвет, то он не меняется, если выделить тройным кликом, то пол. <a><p>....</p></a>
                    //if ((nameTagJ == 'a') && (nameTagP == 'p' || nameTagP == 'h1' || nameTagP == 'h2' || nameTagP == 'h3' || nameTagP == 'h4' || nameTagP == 'h5' || nameTagP == 'h6')) return false;
                    if (nameTagJ == 'a' && htmlMt.length == 0) {
                        var tegJparent = jParent[0].tagName.toLowerCase();
                        if (tegJparent == 'p' || tegJparent == 'h1' || tegJparent == 'h2' || tegJparent == 'h3' || tegJparent == 'h4' || tegJparent == 'h5' || tegJparent == 'h6') break;
                    }

                    element_tek[0].innerHTML = jTek[0].innerHTML;
                    element_tekTwo[0].innerHTML = element_tek[0].outerHTML;
                    jParent.replaceWith(element_tekTwo);

                    jTek = element_tekTwo;
                    jParent = element_tekTwo.parent();
                    element_tek = element_tekTwo.parent();

                    jParentHtml = sel.strip_tags(jParent[0].innerHTML);
                    jTekHtml = sel.strip_tags(jTek[0].innerHTML);
                }

                var spanColor = jQuery(this).closest("span").css("color");

                var child = jQuery(this).children("span");
                var proverka = true;
                if (child && child[0] != undefined && child[0].textContent == jTekHtml) {
                    proverka = false;
                }

                // proverka - если убрать, то если выделить текст поменять цвет, потом задать ему ссылку, и ссылке поменять цвет, то он не меняется

                if (spanColor != undefined && proverka) {
                    // добавленно closest, т.к если просто parent не работает.Если выделить кусок текста поставить ему болд, потом в нем сделать ссылку, потом выделить весь
                    // абзац и поменять цвет, то цвет для ссылки не меняется
                    var parent = jQuery(this).parent().closest("span");

                    var ciklA = parent.find('a');
                    ciklA.each(function () {
                        var styleColor = document.createElement("span");

                        var test = this.innerHTML;
                        styleColor.className = "colorPicker";
                        styleColor.innerHTML = test.replace(/^<span.+?>(.*)<\/span>$/, "$1");
                        jQuery(styleColor).css("color", spanColor);
                        jQuery(this).get(0).innerHTML = styleColor.outerHTML;
                        var lastHTML = jQuery(this).parent().get(0).outerHTML;
                    });

                    if (parent && parent[0] != undefined) {
                        var parentHTML = parent[0].innerHTML;
                        parentHTML = parentHTML.replace(/<span.*?<\/span>/g, "");
                        parentHTML = parentHTML.replace(/<a.*?<\/a>/g, "");
                        parentHTML = sel.trim(sel.strip_tags(parentHTML));
                        if (parentHTML.length == 0) parent.children().unwrap();
                    }
                    spanColor = '';
                }

                // делает из таких конструкци <span><a><span>...</span></a>...</span> такие <span>...</span><a><span>...</span></a>
                var lastHref = jQuery(this).closest("span");

                if (lastHref && lastHref[0] != undefined) {

                    var lengthLastHref = lastHref.find('a');
                    var content;
                    var lastHTML = lastHref[0].outerHTML;

                    var textOneHref = this.textContent;
                    var textHref = sel.strip_tags(lastHTML);
                    var re1 = new RegExp("^" + textOneHref, '');
                    var re2 = new RegExp(textOneHref + "$", '');
                    if (textHref.match(re2) || textHref.match(re1)) {
                        if (textHref.match(re2)) {
                            content = jQuery(this).detach();
                            if (lengthLastHref) lastHref.after(content);
                        }
                        if (textHref.match(re1)) {
                            content = jQuery(this).detach();
                            lastHref.before(content);
                        }
                    }
                }
            } else {
                var probel = this.innerHTML;
                jQuery(this).after(probel);
                jQuery(this).remove();
            }
        });
    },

    // передается jQuery элемент в котором необходимо сделать ссылку родителем, для других элементов

    linkUnite: function linkUnite($parentNodeStart) {
        //var html = this._getSelection();

        var href = $parentNodeStart.find("a");
        var sel = this;
        this.linkParent(href);

        // прилинковка двух ссылок(если они смежные и одинаковые, то из двух ссылок делает одну)
        //var html = this._getSelection();
        if (this.ua.search(/Firefox/) > 0 || this.ua.search(/Safari/) > 0) {
            this.restoreSelection();
        }

        var HTMLParentNodeStart = $parentNodeStart[0].innerHTML;

        var hrefDouble = jQuery($parentNodeStart).find("a");

        var i = 0,
            elementOne,
            elementTwo,
            htmlOne,
            htmlTwo,
            parTeg,
            re,
            html1,
            html2,
            reghtml1,
            reghtml2;

        // проверка, если выделить 2 блока и сделать 1 ссылку

        while (hrefDouble[i + 1] != undefined) {
            elementOne = hrefDouble[i];
            elementTwo = hrefDouble[i + 1];

            var nameTagOne = jQuery(elementOne).closest("p,h1,h2,h3,h4,h5,h6");
            var nameTagTwo = jQuery(elementTwo).closest("p,h1,h2,h3,h4,h5,h6");

            var htmlOneT = nameTagOne[0].innerHTML;
            var htmlTwoT = nameTagTwo[0].innerHTML;
            re = new RegExp(elementOne.outerHTML + "$", '');
            var res1 = htmlOneT.match(re);
            re = new RegExp("^" + elementTwo.outerHTML, '');
            var res2 = htmlTwoT.match(re);

            // Add elementOne.innerText == elementTwo.innerText, because if select two link, and make bold, They change places
            if (elementOne.getAttribute('href') == elementTwo.getAttribute('href') && !res1 && !res2 && elementOne.innerText == elementTwo.innerText) {
                htmlOne = elementOne.innerHTML;
                htmlTwo = elementTwo.innerHTML;

                var parentB = jQuery(elementTwo).closest("b");
                var parentI = jQuery(elementTwo).closest("i");
                if (parentB[0] && parentB[0] != undefined && parentB[0].tagName.toLowerCase() == 'b') htmlTwo = "<b>" + htmlTwo + "</b>";
                if (parentI[0] && parentI[0] != undefined && parentI[0].tagName.toLowerCase() == 'i') htmlTwo = "<i>" + htmlTwo + "</i>";

                parentB = jQuery(elementOne).closest("b");
                parentI = jQuery(elementOne).closest("i");
                var parentAfter;

                if (parentB.find(parentI).get(0) != undefined) parentAfter = parentB;
                if (parentI.find(parentB).get(0) != undefined) parentAfter = parentI;

                if (parentB[0] && parentB[0] != undefined && parentB[0].tagName.toLowerCase() == 'b') {
                    if (parentAfter === undefined) parentAfter = parentB;
                    elementOne.innerHTML = "<b>" + elementOne.innerHTML + "</b>";
                    parentAfter.after(elementOne);
                    var htmlB = parentB.outerHTML;
                }
                if (parentI[0] && parentI[0] != undefined && parentI[0].tagName.toLowerCase() == 'i') {
                    if (parentAfter === undefined) parentAfter = parentI;
                    elementOne.innerHTML = "<i>" + elementOne.innerHTML + "</i>";
                    parentAfter.after(elementOne);
                }
                HTMLParentNodeStart = $parentNodeStart[0].innerHTML;
                html1 = this.regEscape(elementOne.outerHTML);
                html2 = this.regEscape(elementTwo.outerHTML);
                re = new RegExp(html1 + '(.*?)' + html2, '');

                parTeg = HTMLParentNodeStart.match(re);
                if (parTeg && parTeg[1] != undefined && this.strip_tags(parTeg[1]).length == 0) {
                    jQuery(elementTwo).remove();
                    jQuery(elementOne).append(htmlTwo);

                    // если убрать, то если выбрать 2 ссылки и попробывать поменять цвет, то выскакивает ошибка
                    hrefDouble = jQuery($parentNodeStart).find("a");
                }
            }
            i++;
        }

        // удаляет у firefox приставку , которую тот пихает для ссылок
        if (this.ua.search(/Firefox/) > 0) $parentNodeStart.find("a[_moz_dirty]").removeAttr("_moz_dirty");

        // удаляет парные теги типо <b>...</b><b>....</b>
        var div = $parentNodeStart.closest("div");
        var childParagraf = div.find("p,:header");
        childParagraf.each(function () {

            var inHtml = sel.clearEmptyTeg(jQuery(this));

            this.innerHTML = inHtml.replace(/(<\/b><b>|<\/i><i>)/g, '');
        });

        //var parentHTMLIB = $parentNodeStart[0].innerHTML;
        //while (parentHTMLIB.match(/<\/b><b>|<\/i><i>/)) {
        //    $parentNodeStart[0].innerHTML = parentHTMLIB.replace(/(<\/b><b>|<\/i><i>)/g, '');
        //    parentHTMLIB = $parentNodeStart[0].innerHTML;
        //}

        // такие конструкции <a><b>...</b><span><b>...</b></span> превращает в такие <a><b><span>...</span></b></a>
        var arrayTeg = ['b', 'i'];
        var i = 0,
            re;
        href = $parentNodeStart.find("a");
        href.each(function (index, element) {
            while (arrayTeg[i] && arrayTeg[i] != undefined) {
                var hrefHtml = this.innerHTML;
                re = new RegExp("<" + arrayTeg[i] + ">.+?<\/" + arrayTeg[i] + ">", "g");
                var regHtml = hrefHtml.replace(re, '');
                var lengthHtml = sel.strip_tags(regHtml);
                if (lengthHtml.length == 0) {
                    re = new RegExp("<" + arrayTeg[i] + ".*?>|<\/" + arrayTeg[i] + ">", "g");
                    hrefHtml = hrefHtml.replace(re, '');
                    this.innerHTML = "<" + arrayTeg[i] + ">" + hrefHtml + "</" + arrayTeg[i] + ">";
                }
                i++;
            }
        });
        var span = $parentNodeStart.find("span > span");

        // удаляет такие конструкции <span><span><span>.....</span></span></span>
        span.each(function () {
            var parent = jQuery(this).parent();
            var tek = jQuery(this);
            if (sel.strip_tags(tek[0].innerHTML) == sel.strip_tags(parent[0].innerHTML)) parent[0].outerHTML = tek[0].outerHTML;
        });

        this.restoreSelection();
    },
    regEscape: function regEscape(text) {
        // если убрать то при изменении цвета у этого блока выплывает ошибка http://joxi.ru/l2Z6bDxhY98P2J
        if (!text) return "";
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    },
    toHTML: function toHTML(docFragment) {
        var d = document.createElement('div');
        d.appendChild(docFragment);
        return d.innerHTML;
    },
    setFont: function setFont(inputFont) {
        if (this.ua.search(/Safari/) > 0 || this.ua.search(/Trident/) > 0) {

            this.restoreSelection();
        }

        if (this._getSelection().length == 0) return false;

        var res = {},
            font = {},
            addClassInElem,
            removeClassElem,
            classNames = {},
            prefixClassName;
        var html, $parentEndB, $parentStartB, $parentNodeStart, $parentNodeEnd, selectedText, parentNodeStart, parentNodeEnd, rang, s;
        if (typeof inputFont.family !== 'undefined') font['fontFamily'] = inputFont.family;
        //if (typeof inputFont.size !== 'undefined') font['fontSize'] = inputFont.size;
        //if (typeof inputFont.height !== 'undefined') font['lineHeight'] = inputFont.height;
        if (typeof inputFont.spacing !== 'undefined') font['letterSpacing'] = inputFont.spacing;
        if (typeof inputFont.align !== 'undefined') font['textAlign'] = inputFont.align;

        if (typeof inputFont.size !== 'undefined') classNames['text-font-size'] = inputFont.size;
        if (typeof inputFont.height !== 'undefined') classNames['text-line-height'] = inputFont.height;

        removeClassElem = function ($this, mask) {
            return $this.removeClass(function (index, cls) {
                var re = mask.replace(/\*/g, '\\S+');
                return (cls.match(new RegExp('\\b' + re + '', 'g')) || []).join(' ');
            });
        };

        addClassInElem = function ($elem, classNames) {
            for (var key in classNames) {
                removeClassElem($elem, key + "*");
                prefixClassName = String(classNames[key]).replace(".", "-");
                $elem.addClass(key + "-" + prefixClassName);
            }
        };

        if (window.getSelection) {
            selectedText = window.getSelection();
        } else if (document.getSelection) {
            selectedText = document.getSelection();
        } else if (document.selection) {
            selectedText = document.selection.createRange();
        }
        rang = selectedText.getRangeAt(0);
        parentNodeStart = rang.startContainer.parentNode;
        parentNodeEnd = rang.endContainer.parentNode;
        $parentNodeStart = jQuery(parentNodeStart);
        $parentNodeEnd = jQuery(parentNodeEnd);

        var ua = this.ua;

        // if (ua.search(/Firefox/) > 0) {
        parentNodeStart = rang.startContainer;
        parentNodeEnd = rang.endContainer;
        $parentNodeStart = jQuery(parentNodeStart);
        $parentNodeEnd = jQuery(parentNodeEnd);
        // }

        $parentStartB = $parentNodeStart.closest("p,h1,h2,h3,h4,h5,h6,div");
        $parentEndB = $parentNodeEnd.closest("p,h1,h2,h3,h4,h5,h6,div");
        var parentTot = $parentStartB.closest("div");

        html = this._getSelection();

        //debugger;
        var tagNamesStart = $parentStartB[0].tagName;
        var tagNamesEnd = $parentNodeEnd[0].tagName;
        if (tagNamesEnd !== undefined && tagNamesStart !== undefined && (tagNamesStart.toLowerCase() == 'div' || tagNamesEnd.toLowerCase() == 'div')) {
            $parentStartB.css(font);
            addClassInElem($parentStartB, classNames);
        } else {
            if ($parentStartB[0] != $parentEndB[0]) {
                $parentStartB.css(font);
                addClassInElem($parentStartB, classNames);
                $parentEndB.css(font);
                addClassInElem($parentEndB, classNames);
                $parentStartB = $parentStartB.next();

                var i = 0;
                while ($parentStartB[0] != $parentEndB[0]) {

                    $parentStartB.css(font);
                    addClassInElem($parentStartB, classNames);
                    $parentStartB = $parentStartB.next();
                }
            } else {
                $parentStartB.css(font);
                addClassInElem($parentStartB, classNames);
            }
        }
        this.clearEmptyTeg($parentStartB);
        parentTot.find("br").removeAttr("style");
        this.removeStyleEmptyTeg();

        // закоментил т.к в хроме при изменении шрифта исчезает меню с самим шрифтом
        //if (this.ua.search(/Safari/) > 0) {
        //
        //    this._changePosition();
        //}
    },

    _getSelection: function _getSelection() {
        var html = '',
            sel;
        if (typeof window.getSelection != 'undefined') {
            sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement('div');
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        } else if (typeof document.selection != 'undefined') {
            if (document.selection.type == 'Text') {
                html = document.selection.createRange().htmlText;
            }
        }
        return html;
    },

    _getSelectionPosition: function _getSelectionPosition() {
        var range = window.getSelection().getRangeAt(0),
            boundary = range.getBoundingClientRect();

        return {
            offset: {
                top: boundary.top + jQuery(document).scrollTop(),
                left: boundary.left
            },
            width: boundary.width,
            height: boundary.height
        };
    },
    _rgb2hex: function _rgb2hex(rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return rgb && rgb.length === 4 ? "#" + ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) + ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) + ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    }

};

module.exports = Editor;

},{}],151:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Core.RichText',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Visual = require('../../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    string = require('../../../../../editor/js/model/basic/string'),
    TextEditor = require('./TextEditor'),
    BarNoExtend = require('../../../../../editor/js/component/bar/BarNoExtend');

ModelDefinition[T] = string.ModelDefinition.extend({
	value: '<p>Core.RichText default</p>'
});

VisualDefinition[T] = VisualDefinition.extend({
	defaultProps: {
		className: ''
	},
	componentDidMount: function componentDidMount() {
		var _this = this,
		    $node = jQuery(this.getDOMNode()),
		    $contenteditable = jQuery(this.refs.contentEditable.getDOMNode());

		this._editor = new TextEditor(this.getDOMNode(), {
			showOrChangePosition: function showOrChangePosition(position, data) {
				var barItems = [{
					item: 'font',
					onChange: _this.handleFont,
					onClick: _this.handleFontOpen
				}, {
					item: 'color',
					onChange: _this.handleColor,
					onPreview: _this.handleColor
				}, {
					item: 'bold',
					onClick: _this.handleBold
				}, {
					item: 'italic',
					onClick: _this.handleItalic
				}, {
					item: 'headings',
					onChange: _this.handleHeading,
					onClick: _this.handleHeadingOpen
				}, {
					item: 'link',
					onChange: _this.handleLink,
					onClick: _this.handleLinkOpen
				}];

				for (var i = 0; i < barItems.length; i++) {
					if (data.link && barItems[i].item === "link") {
						barItems[i].value = data.link;
					}
					if (data.color && barItems[i].item === "color") {
						barItems[i].value = data.color;
					}
					if (data.font && barItems[i].item === "font") {
						barItems[i].value = data.font;
					}
					if (data.bold && barItems[i].item === "bold") {
						barItems[i].value = data.bold;
					}
					if (data.italic && barItems[i].item === "italic") {
						barItems[i].value = data.italic;
					}
					if (data.title && barItems[i].item === "headings") {
						barItems[i].value = data.title;
					}
				}

				$node.trigger('visual.bar', [{
					items: barItems,
					position: position,
					text: true
				}]);
			},
			hide: function hide() {
				$node.trigger('visual.bar-out', [{ text: true }]);
			}
		});

		// stop mouseover events in content editable blocks.
		$node.on('mouseover', function (event) {
			event.preventDefault();
			event.stopPropagation();
		});

		$node.on('keyup', function (event) {
			if (event.which === 8 || event.which === 46) {
				_this.handleBackSpace(event);
			}
		});

		$node.on('keydown', function (event) {
			if (event.which === 8) {
				_this.handleBackSpaceDown(event);
			}
			if (event.which === 46) {
				_this.handleDeleteDown(event);
			}
			if (event.which === 13) {
				if (!event.shiftKey) {
					_this.keyUpEnter(event);
				} else {
					event.preventDefault();
					event.stopPropagation();
				}
			}
			if (event.which === 66 && (event.metaKey || event.ctrlKey)) {
				_this.handleBold();
				event.preventDefault();
				event.stopPropagation();
			}
			if (event.which === 73 && (event.metaKey || event.ctrlKey)) {
				_this.handleItalic();
				event.preventDefault();
				event.stopPropagation();
			}
			if (event.which === 90 && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				event.stopPropagation();
			}
		});

		$node.on('paste', function (event) {
			_this.setPaste(event.originalEvent);
		});

		$node.on('drop', function (e) {
			e.preventDefault();
		});

		$contenteditable.on('focus', function (event, isRealEvent) {
			if (typeof isRealEvent === "undefined") {
				_this.handleBlur(true);
				$node.addClass('visual-js-editor-was-focused');
			}
		});

		$contenteditable.on('blur', function () {
			// Disable transition contained elements in content editable
			var $this = $(this);
			$this.addClass('visual-content-editable-noTransitions');
			setTimeout(function () {
				$this.removeClass('visual-content-editable-noTransitions');
			}, 5000);
		});

		jQuery(window).on('mousedown', function (event) {
			var $target = jQuery(event.target);
			if ($node.is('.visual-js-editor-was-focused') && $target.closest($node).length === 0 && $target.closest('#visualBar').length === 0) {
				$node.removeClass('visual-js-editor-was-focused');
				_this.handleBlur(false);
				$node.trigger('focus', [false]).focusout();
				window.getSelection().removeAllRanges();
			}
		});
	},
	keyUpEnter: function keyUpEnter(e) {
		this._editor.setkeyUpEnter(e);
	},
	setPaste: function setPaste(e) {
		this._editor.paste(e);
	},
	handleDeleteDown: function handleDeleteDown(e) {
		this._editor.deleteDown(e);
	},
	handleBackSpace: function handleBackSpace(e) {
		this._editor.setBackSpace(e);
	},
	handleBackSpaceDown: function handleBackSpaceDown(e) {
		this._editor.BackSpaceDown(e);
	},
	handleBold: function handleBold() {
		this._editor.setBold();
	},
	handleItalic: function handleItalic() {
		this._editor.setItalic();
	},
	handleUnderline: function handleUnderline() {
		this._editor.setUnderline();
	},
	handleLink: function handleLink(url) {
		this._editor.createLink(url);
	},
	handleLinkOpen: function handleLinkOpen() {
		this._editor.restoreSelection();
	},
	handleColor: function handleColor(hex, rgb) {
		this._editor.setColor(hex);
	},
	handleFont: function handleFont(data) {
		this._editor.setFont(data);
	},
	handleFontOpen: function handleFontOpen() {
		this._editor.restoreSelection();
	},
	handleHeading: function handleHeading(type) {
		this._editor.setTitle(type);
	},
	handleHeadingOpen: function handleHeadingOpen() {
		this._editor.restoreSelection();
	},

	getEditableElement: function getEditableElement() {
		return this.refs['contentEditable'] && this.refs['contentEditable'].getDOMNode();
	},
	shouldComponentUpdate: function shouldComponentUpdate(newProps) {
		var v = _.has(newProps, 'value') ? newProps.value : this.getDefaultValue();
		return v != this.getEditableElement().innerHTML;
	},
	handleFocus: function handleFocus() {
		jQuery(this.getDOMNode()).addClass('visual-content-editable-focus');
	},
	handleBlur: function handleBlur(isOpenBar) {
		if (!isOpenBar) {
			// this.getDOMNode() throws when the component isn't mounted
			try {
				jQuery(this.getDOMNode()).removeClass('visual-content-editable-focus');
			} catch (e) {}
		}
		this.handleDebounceSave();
	},
	handleDebounceSave: _.debounce(function () {
		var node = this.getEditableElement(),
		    htmlCode;

		if (!node) {
			return;
		}

		htmlCode = node.innerHTML;
		if (this.value() !== htmlCode) {
			this.props.onChange(htmlCode);
		}
	}, 1000),
	renderForEdit: function renderForEdit() {
		// onInput={this.handleInput} is too slow
		return React.createElement(
			BarNoExtend,
			null,
			React.createElement(
				'div',
				{ className: 'visual-content-editable-wrap' },
				React.createElement('div', { className: 'visual-content-editable-child' }),
				React.createElement('div', _extends({}, this.propsExclude(), {
					ref: 'contentEditable',
					contentEditable: 'true',
					placeholder: 'Enter text here...',
					onFocus: this.handleFocus,
					onBlur: this.handleBlur,
					onKeyUp: this.handleDebounceSave,
					dangerouslySetInnerHTML: { __html: this.value() }
				}))
			)
		);
	},
	renderForView: function renderForView() {
		return React.createElement('div', _extends({}, this.propsExclude(), { dangerouslySetInnerHTML: { __html: this.value() } }));
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/Visual":3,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/component/bar/BarNoExtend":80,"../../../../../editor/js/model/basic/string":141,"./TextEditor":150}],152:[function(require,module,exports){
'use strict';

var T = 'Core.Text',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar'),
    keys = {
	ENTER: 13,
	DELETE: 46,
	BACKSPACE: 8,
	ARROWPREV: 37,
	ARROWNEXT: 39,
	B: 66,
	I: 73,
	U: 85
};

ModelDefinition[T] = VisualString.ModelDefinition.extend({
	value: 'Core.Text default'
});

VisualDefinition[T] = VisualDefinition.extend({
	defaultProps: {
		pattern: null,
		getContentEditable: function getContentEditable($node) {
			return $node;
		},
		onFocus: function onFocus($node) {
			$node.addClass('visual-content-editable-outline');
		},
		onBlur: function onBlur($node) {
			$node.removeClass('visual-content-editable-outline');
		}
	},
	componentWillMount: function componentWillMount() {
		this._pattern = this.props.pattern ? new RegExp(this.props.pattern) : null;

		// set this as an instance property because debounce
		// only takes the last components changes when
		// editing multiple components quickly
		this.handleInput = _.debounce((function () {
			var text = this.getDOMNode().innerText;
			this.props.onChange(text);
		}).bind(this), 1000);
	},
	componentDidMount: function componentDidMount() {
		var $contentEditable = this.props.getContentEditable(jQuery(this.getDOMNode()));

		$contentEditable.on('click', function (e) {
			e.preventDefault();
		});
		$contentEditable.attr('contenteditable', true);
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var child = React.Children.only(this.props.children);

		var props = _.extend({
			onFocus: this.handleFocus,
			onBlur: this.handleBlur,
			onKeyDown: this.handleKeyDown,
			onInput: this.handleInput
		}, _.omit(child.props, 'className')); // Use _.omit() because react doubles the className

		return React.addons.cloneWithProps(child, props);
	},
	renderForView: function renderForView(v, Vi) {
		return React.Children.only(this.props.children);
	},
	handleFocus: function handleFocus() {
		this.props.onFocus(jQuery(this.getDOMNode()));
	},
	handleBlur: function handleBlur() {
		this.props.onBlur(jQuery(this.getDOMNode()));
	},
	handleKeyDown: function handleKeyDown(e) {
		var isEnter = e.which === keys.ENTER,
		    isBackspace = e.which === keys.BACKSPACE,
		    isDelete = e.which === keys.DELETE,
		    isArrow = e.which === keys.ARROWPREV || e.which === keys.ARROWNEXT,
		    isFormatting = (e.metaKey || e.ctrlKey) && [keys.B, keys.I, keys.U].indexOf(e.which) !== -1,
		    notMatchesPattern = !(this._pattern ? this._pattern.test(e.key) || isBackspace || isDelete || isArrow : true);

		if (isEnter || isFormatting || notMatchesPattern) {
			e.preventDefault();
		}
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/string":141}],153:[function(require,module,exports){
'use strict';

var T = 'Core.Video',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Bar = require('../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
    properties: {
        url: VisualString.property(),
        type: VisualString.property()
    }
});

VisualDefinition[T] = VisualDefinition.extend({
    renderForEdit: function renderForEdit(v, Vi) {
        return React.createElement(
            Bar,
            {
                item: 'video',
                value: v,
                onChange: this.props.onChange
            },
            this.props.children
        );
    },
    renderForView: function renderForView(v, Vi) {
        return this.props.children;
    }
});

module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141}],154:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    Model = require('../../../../../editor/js/Model'),
    ScrollPane = require('../../../../../editor/js/component/ScrollPane'),
    s4 = require('../../../../../editor/js/helper/utils/MiscUtils').randomStringFragment;

var SIZE_ITEMS = {
	width: 300,
	distance: 13
};

var cachedBlocks = null;
var VisualContainerPlus = React.createClass({
	displayName: 'VisualContainerPlus',

	VIEW_ALL_TAB: 'view all',

	getDefaultProps: function getDefaultProps() {
		return {
			blocks: {},
			onAddBlock: function onAddBlock(blockItem) {}
		};
	},

	getInitialState: function getInitialState() {
		return {
			isOpened: false,
			stateForUpdateScrollBar: false
		};
	},

	componentDidMount: function componentDidMount() {
		var $container = jQuery('.visual-container-content-in', this.getDOMNode()),
		    $blocksContainer = jQuery('.visual-container-blocks-items-in', $container);

		// set the first tab (VIEW ALL) to be active
		jQuery('.visual-container-tab-item-' + this.clearTag(this.VIEW_ALL_TAB), $container).addClass('visual-container-tab-active');

		// init isotope
		$blocksContainer.isotope({
			itemSelector: '.visual-isotope-item'
		});
		$blocksContainer.on('arrangeComplete', (function () {
			this.setState({
				stateForUpdateScrollBar: !this.state.stateForUpdateScrollBar
			});
		}).bind(this));

		// ???
		$blocksContainer.on('mouseenter', '.visual-container-block', function () {
			$(this).addClass('visual-container-block-hover');
		}).on('mouseleave', '.visual-container-block', function () {
			$(this).removeClass('visual-container-block-hover');
		});
	},

	clearTag: function clearTag(tag) {
		return tag.replace(' ', '_');
	},

	getIsotopeFilterName: function getIsotopeFilterName(tag) {
		return 'visual-filter-' + this.clearTag(tag);
	},

	render: function render() {
		var blocks = this.props.blocks,
		    tabs = [this.VIEW_ALL_TAB].concat(_.keys(blocks)),
		    tabElements,
		    blockElements,
		    forUpdateBlock;

		tabElements = _.map(tabs, function (tab) {
			var tag = this.clearTag(tab);
			var className = 'visual-container-tab-item visual-container-tab-item-' + tag;
			return React.createElement(
				'div',
				{
					key: 'visual-blocks-tag-' + tag,
					className: className,
					onClick: this.handleChangeFilter.bind(null, tab)
				},
				tab
			);
		}, this);

		/*
   * First we massage the block data from something like this
   *
   * {
   *   header: ['Header1', 'Header3'],
   *   content: ['Content1', 'Slider1', 'Slider2'],
   *   slider: ['Slider1', 'Slider2'],
   *   footer: ['Footer1']
   * }
   *
   * To the following structure
   *
   * {
   *   Header1: ["header"],
   *   Header3: ["header"],
   *   Content1: ["content"],
   *   Slider1: ["content", "slider"],
   *   Slider2: ["content", "slider"],
   *   Footer1: ["footer"]
   * }
   *
   * And then create the needed markup from it
   */
		if (!cachedBlocks) {
			// TODO: this is a temporary ugly solution that pushesh the menu block last, must fix it later
			var _blocks = _.extend(_.omit(blocks, 'menu'), { menu: blocks.menu });
			cachedBlocks = _.chain(_blocks).map(function (taggedBlocks, tag) {
				return _.map(taggedBlocks, function (blockId) {
					return { blockId: blockId, tag: tag };
				});
			}).flatten().groupBy(function (blockInfo) {
				return blockInfo.blockId;
			}).mapObject(function (blocks) {
				return _.pluck(blocks, 'tag');
			}).value();
		}

		blockElements = _.map(cachedBlocks, function (blockTags, blockId) {
			var v = Model[blockId].visual,
			    isotopFilterNames = _.map(blockTags, this.getIsotopeFilterName).join(' '),
			    itemClassName = 'visual-isotope-item visual-container-block ' + isotopFilterNames;

			return React.createElement(
				'div',
				{
					key: 'visual-block-' + blockId,
					onClick: this.insert.bind(null, blockId),
					className: itemClassName
				},
				React.createElement('img', { src: v.screenshot, alt: 'Add ' + blockId + ' block' }),
				React.createElement('div', { className: 'visual-container-block-btn' }),
				React.createElement(
					'div',
					{ className: 'visual-container-title' },
					v.title
				)
			);
		}, this);

		// ????
		if (this.state.stateForUpdateScrollBar) {
			forUpdateBlock = React.createElement('span', { 'data-fake': '1' });
		} else {
			forUpdateBlock = React.createElement('span', { 'data-fake': '2' });
		}

		var className1 = 'visual-container-whiteout ' + (this.state.isOpened ? 'visual-container-whiteout-show' : '');
		var className2 = 'visual-container-wrap ' + (this.state.isOpened ? 'visual-container-open' : '');
		var width = blockElements.length * (SIZE_ITEMS.width + SIZE_ITEMS.distance) + SIZE_ITEMS.distance;
		return React.createElement(
			'div',
			{ className: 'visual-container-plus' },
			React.createElement('div', { onClick: this.toggleOpen, className: className1 }),
			React.createElement(
				'div',
				{ className: className2 },
				React.createElement(
					'div',
					{ onClick: this.toggleOpen, className: 'visual-container-trigger' },
					React.createElement('div', { className: 'visual-container-trigger-inner' })
				),
				React.createElement(
					'div',
					{ className: 'visual-container-container' },
					React.createElement(
						'div',
						{ className: 'visual-container-content' },
						React.createElement(
							'div',
							{ className: 'visual-container-content-in' },
							React.createElement(
								'div',
								{ className: 'visual-container-tabs' },
								tabElements
							),
							React.createElement(
								'div',
								{ className: 'visual-container-blocks-items' },
								React.createElement(
									'div',
									{ className: 'visual-container-blocks-items-scroll' },
									React.createElement(
										ScrollPane,
										{ ref: 'scrollpane', style: { height: '100%' }, onlyWide: true },
										React.createElement(
											'div',
											{ className: 'visual-container-blocks-items-in', style: { width: width } },
											blockElements
										),
										forUpdateBlock
									)
								)
							)
						)
					)
				)
			)
		);
	},

	handleChangeFilter: function handleChangeFilter(tab) {
		var $container = jQuery('.visual-container-content-in', this.getDOMNode()),
		    $blocksContainer = jQuery('.visual-container-blocks-items-in', $container),
		    $tabs = jQuery('.visual-container-tab-item', $container);

		// set the active class to current active tab
		$tabs.removeClass('visual-container-tab-active');
		$tabs.filter('.visual-container-tab-item-' + this.clearTag(tab)).addClass('visual-container-tab-active');

		// set the blocks container's width so that the blocks
		// will be displayed into a single row
		var itemsCount;
		if (tab === this.VIEW_ALL_TAB) {
			// by this time the cachedBlocks will be initialized
			itemsCount = _.keys(cachedBlocks).length;
		} else {
			itemsCount = this.props.blocks[tab] ? this.props.blocks[tab].length : 0;
		}
		$blocksContainer.css({
			width: itemsCount * (SIZE_ITEMS.width + SIZE_ITEMS.distance) + SIZE_ITEMS.distance
		});

		// call isotope to filter the blocks
		var filter = tab === this.VIEW_ALL_TAB ? '*' : '.' + this.getIsotopeFilterName(tab);
		$blocksContainer.isotope({
			filter: filter
		});
	},

	insert: function insert(blockId) {
		// resetPosition after add element to page
		this.refs.scrollpane.handleSetPositionWide(0);
		this.props.onAddBlock({
			type: blockId,
			value: JSON.parse(JSON.stringify(_.extend({ blockId: 'block-' + s4() + s4() + s4() + s4() }, Model[blockId].value)))
		});
		this.toggleOpen(false);
	},

	toggleOpen: function toggleOpen(open) {
		var o = _.isBoolean(open) ? open : !this.state.isOpened;
		this.setState({ isOpened: o }, function () {
			// Trigger scroll event for running animation
			if (!this.state.isOpened) {
				setTimeout(function () {
					$(window).trigger('scroll');
				}, 300);
			}
		});

		var $window = jQuery(window),
		    bottomOffset = jQuery('.visual-container-wrap', this.getDOMNode()).offset().top + 430 - $window.scrollTop(),
		    windowHeight = $window.height();
		if (bottomOffset - windowHeight > 0) {
			jQuery('html,body').animate({
				scrollTop: bottomOffset - windowHeight + $window.scrollTop()
			});
		}
	}

});

module.exports = VisualContainerPlus;

},{"../../../../../editor/js/Model":1,"../../../../../editor/js/component/ScrollPane":64,"../../../../../editor/js/helper/utils/MiscUtils":127}],155:[function(require,module,exports){
'use strict';

var T = 'VisualContainer',
    React = (window.React),
    Model = require('../../../../../editor/js/Model'),
    Visual = require('../../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArray = require('../../../../../editor/js/model/basic/array'),
    VisualContainerPlus = require('./VisualContainerPlus');

ModelDefinition[T] = VisualArray.ModelDefinition.extend({});

VisualDefinition[T] = VisualArray.VisualDefinition.extend({
    componentDidMount: function componentDidMount() {
        $(this.getDOMNode()).on('mouseenter', function () {
            $('.visual-under-bar', this).removeClass('visual-under-bar');
        });
    },
    wrapContainer: function wrapContainer(items) {
        if (Visual.renderMethod === 'renderForView') {
            return React.createElement(
                'div',
                null,
                items
            );
        }

        if (items.length === 0) {
            return React.createElement(
                'div',
                { className: 'visual-wrap-block-wrap visual-wrap-block-wrap-first' },
                React.createElement('div', { className: 'visual-wrap-block-empty-background' }),
                React.createElement(
                    'div',
                    { className: 'visual-wrap-block-empty-page' },
                    React.createElement(
                        'div',
                        { className: 'visual-wrap-block-empty-page-heading' },
                        'START BUILDING YOUR PAGE'
                    ),
                    React.createElement(
                        'div',
                        { className: 'visual-wrap-block-empty-page-heading2' },
                        'Press the button above to add blocks'
                    )
                ),
                this.renderVisualContainerPlus(-1),
                items
            );
        } else {
            return React.createElement(
                'div',
                { className: 'visual-wrap-block-wrap' },
                items
            );
        }
    },
    item: function item(itemData, itemIndex) {
        if (!Model[itemData.type]) {
            console.error('invalid block: ', itemData.type);
        }

        var props = {
            model: Model[itemData.type],
            value: itemData.value,
            onChange: this.handleItemChange.bind(this, itemIndex),
            index: itemIndex
        };

        var value = this.value();
        var prevItemData = value[itemIndex - 1];
        var prevItemContextValue = prevItemData && prevItemData.value.neighboursValue && prevItemData.value.neighboursValue.next;
        if (prevItemContextValue) {
            props.contextValue = prevItemContextValue;
        }

        return React.createElement(Visual, props);
    },
    wrapItem: function wrapItem(item, itemIndex, itemValue, itemType) {
        if (Visual.renderMethod === 'renderForView') {
            return item;
        }

        return React.createElement(
            'div',
            { className: 'visual-wrap-block-item visual-wrap-block-item-' + itemType },
            item,
            this.renderVisualContainerPlus(itemIndex)
        );
    },
    renderVisualContainerPlus: function renderVisualContainerPlus(index) {
        return React.createElement(VisualContainerPlus, {
            blocks: this.props.blocks,
            onAddBlock: this.append.bind(null, index)
        });
    },
    append: function append(itemIndex, value) {
        return this.insert(value, itemIndex + 1);
    }
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};
/*
   insert a VisualContainerPlus so that
   we can prepend the first block
*/

},{"../../../../../editor/js/Model":1,"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/Visual":3,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/array":135,"./VisualContainerPlus":154}],156:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'VisualPage',
    _ = (window._),
    React = (window.React),
    Visual = require('../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualContainer = require('../../../../editor/js/model/visual/VisualContainer'),
    VisualSidebar = require('../../../../editor/js/model/visual/VisualSidebar'),
    Notifications = require('../../../../editor/js/component/Notifications'),
    Overlays = require('../../../../editor/js/component/Overlays'),
    BarManager = require('../../../../editor/js/component/bar/BarManager'),
    Prompts = require('../../../../editor/js/component/prompts/Prompts');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
    properties: {
        container: VisualContainer.property()
    }
});

VisualDefinition[T] = VisualDefinition.extend({
    shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
        return nextProps.value !== this.props.value;
    },
    renderForEdit: function renderForEdit(v, Vi) {
        return React.createElement(
            Notifications,
            null,
            React.createElement(
                Overlays,
                null,
                React.createElement(
                    BarManager,
                    null,
                    React.createElement(
                        Prompts,
                        null,
                        this.getContainer({ className: 'page-container-editor' }),
                        this.getSidebar()
                    )
                )
            )
        );
    },
    renderForView: function renderForView(v, Vi) {
        return this.getContainer({ className: 'page-container-preview' });
    },
    getContainer: function getContainer(props) {
        var v = this.props.value,
            Container = Visual[VisualContainer.type],
            props = props || {};
        return React.createElement(Container, _extends({}, props, {
            id: 'page-container',
            blocks: this.props.blocks,
            value: v.container,
            onChange: this.handleChange.bind(null, 'container')
        }));
    },
    getSidebar: function getSidebar(props) {
        var v = this.props.value,
            Sidebar = Visual[VisualSidebar.type],
            props = props || {};
        return React.createElement(Sidebar, _extends({}, props, {
            id: 'page-sidebar',
            value: v.container,
            onChange: this.handleChange.bind(null, 'container')
        }));
    }
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/Visual":3,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/Notifications":8,"../../../../editor/js/component/Overlays":63,"../../../../editor/js/component/bar/BarManager":77,"../../../../editor/js/component/prompts/Prompts":93,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/visual/VisualContainer":155,"../../../../editor/js/model/visual/VisualSidebar":164}],157:[function(require,module,exports){
'use strict';

var React = (window.React),
    jQuery = (window.jQuery),
    Model = require('../../../../../editor/js/Model'),
    ScrollPane = require('../../../../../editor/js/component/ScrollPane'),
    Sortable = require('../../../../../editor/js/component/dragdrop/Sortable'),
    AutoScroll = require('../../../../../editor/js/component/dragdrop/AutoScroll');

var BlocksSortable = React.createClass({
    displayName: 'BlocksSortable',

    getInitialState: function getInitialState() {
        return {
            sortableActive: false
        };
    },

    render: function render() {
        return React.createElement(
            ScrollPane,
            { style: { height: '100%' }, className: 'visual-sidebar-ordering visual-scroll-pane', wrapScrollable: this.wrapScrollable },
            React.createElement(Sortable, {
                items: this.props.items,
                renderContainer: this.renderContainer,
                renderItem: this.renderItem,
                onChange: this.handleSortableChange,
                onChangeState: this.handleSortableChangeState
            })
        );
    },

    renderContainer: function renderContainer(sortable, children) {
        var insertion = sortable.getInsertion();
        return React.createElement(
            'div',
            null,
            children,
            insertion ? sortable.renderFeedback(insertion) : null
        );
    },

    renderItem: function renderItem(sortable, item) {
        var className = 'visual-sidebar-block-item',
            handleMouseDown = null,
            style;

        switch (item.type) {
            case 'item':
                handleMouseDown = sortable.createMouseDownHandler(item);
                break;
            case 'selection':
                return null;
            case 'insertion':
                className += ' visual-sidebar-block-item-placeholder visual-placeholder-fix';
                break;
            case 'feedback':
                className += ' visual-sidebar-block-item-feedback';
                break;
        }

        // missing block
        if (!Model[item.value.type]) {
            className += ' visual-sidebar-block-item-missing';
            style = {
                backgroundColor: 'lightgray'
            };
        } else {
            style = {
                backgroundImage: "url(\"" + Model[item.value.type].visual.screenshot + "\")"
            };
        }

        return React.createElement(
            'div',
            { className: className },
            React.createElement(
                'div',
                { className: 'visual-sidebar-block-image', style: style },
                React.createElement(
                    'div',
                    { onMouseDown: handleMouseDown, className: 'visual-sidebar-block-layout' },
                    React.createElement(
                        'span',
                        { className: 'visual-sidebar-drag' },
                        'Drag to reorder'
                    )
                )
            ),
            React.createElement(
                'div',
                { onClick: this.handleRemoveItem.bind(null, item.index), className: 'visual-sidebar-block-remove' },
                React.createElement('i', { className: 'visual-bar-icon visual-icon-remove-block' })
            )
        );
    },

    wrapScrollable: function wrapScrollable(item) {
        return React.createElement(
            AutoScroll,
            { active: this.state.sortableActive, capture: true },
            item
        );
    },

    handleSortableChange: function handleSortableChange(updatedItems) {
        this.props.onItemsChange(updatedItems);
    },

    handleSortableChangeState: function handleSortableChangeState(active) {
        this.setState({ sortableActive: active });

        if (active) {
            this.props.onDragStart();
        } else {
            this.props.onDragEnd();
        }
    },

    handleRemoveItem: function handleRemoveItem(index) {
        var updatedItems = React.addons.update(this.props.items, { $splice: [[index, 1]] });
        this.props.onItemRemoved();
        this.props.onItemsChange(updatedItems);
    }

});

module.exports = BlocksSortable;
/*<span className="visual-sidebar-drop">Drop</span>*/

},{"../../../../../editor/js/Model":1,"../../../../../editor/js/component/ScrollPane":64,"../../../../../editor/js/component/dragdrop/AutoScroll":87,"../../../../../editor/js/component/dragdrop/Sortable":89}],158:[function(require,module,exports){
'use strict';

var _ = (window._);
var React = (window.React);
var UIState = require('../../../../../../editor/js/global/UIState');
var ScrollPane = require('../../../../../../editor/js/component/ScrollPane');
var Select = require('../../../../../../editor/js/component/controls/Select');
var SelectItem = require('../../../../../../editor/js/component/controls/Select/SelectItem');

var getAllColorSchemes = require('../../../../../../wireframes/bootstraps/utils/colorSchemes/getAll');

var ColorSchemes = React.createClass({
  displayName: 'ColorSchemes',

  onChange: function onChange(value) {
    UIState.set('colorScheme', value);
  },
  renderOptions: function renderOptions() {
    return _.map(getAllColorSchemes(), function (colorScheme) {
      return React.createElement(
        SelectItem,
        { key: colorScheme.id, value: colorScheme.id },
        React.createElement('span', { className: 'select-color', style: { background: colorScheme.previewColor } }),
        React.createElement(
          'span',
          { className: 'select-title' },
          colorScheme.title
        )
      );
    }, this);
  },
  render: function render() {
    return React.createElement(
      'div',
      { className: 'visual-sidebar-styling-row visual-sidebar-styling-color' },
      React.createElement(
        'div',
        { className: 'visual-sidebar-styling-label' },
        'Colour Schemes:'
      ),
      React.createElement(
        'div',
        { className: 'visual-sidebar-select-scheme visual-sidebar-select-scheme-color' },
        React.createElement(
          Select,
          {
            defaultValue: UIState.get('colorScheme'),
            maxItems: '6',
            itemHeight: '40',
            onChange: this.onChange
          },
          this.renderOptions()
        )
      )
    );
  }
});

module.exports = ColorSchemes;

},{"../../../../../../editor/js/component/ScrollPane":64,"../../../../../../editor/js/component/controls/Select":86,"../../../../../../editor/js/component/controls/Select/SelectItem":85,"../../../../../../editor/js/global/UIState":101,"../../../../../../wireframes/bootstraps/utils/colorSchemes/getAll":244}],159:[function(require,module,exports){
'use strict';

var _ = (window._);
var React = (window.React);
var Globals = require('../../../../../../editor/js/global/Globals');
var Select = require('../../../../../../editor/js/component/controls/Select');
var SelectItem = require('../../../../../../editor/js/component/controls/Select/SelectItem');
var editorFonts = require('../../../../../../editor/js/config/fonts');
var getFontsDefaults = require('../../../../../../wireframes/bootstraps/utils/fontSchemes/get');

var fontSizeMap = {
  'default': "14px",
  great_vibes: "16px",
  alex_brush: "16px",
  allura: "16px",
  parisienne: "16px"
};

var FontSchemes = React.createClass({
  displayName: 'FontSchemes',

  indexesCache: null,
  optionsCache: null,
  componentWillMount: function componentWillMount() {
    this.valuesCache = getValues();
    this.optionsCache = getOptions();

    function getValues() {
      var fontsDefaults = getFontsDefaults();
      return {
        headings: fontsDefaults.headings,
        paragraphs: fontsDefaults.paragraphs
      };
    }

    function getOptions() {
      return _.map(editorFonts, function (font, familyKey) {
        var style = {
          fontFamily: font.family,
          fontSize: fontSizeMap[familyKey] || fontSizeMap['default']
        };
        return React.createElement(
          SelectItem,
          { key: familyKey, value: familyKey },
          React.createElement(
            'span',
            { className: 'select-title', style: style },
            font.title
          )
        );
      });
    }
  },
  onFontChange: function onFontChange(dropdown, value) {
    var globalsValue = Globals.get('sidebar.fonts') || {};
    globalsValue[dropdown] = value;
    Globals.set('sidebar.fonts', globalsValue, 'project');
  },
  render: function render() {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { className: 'visual-sidebar-styling-row' },
        React.createElement(
          'div',
          { className: 'visual-sidebar-styling-label' },
          'Headings:'
        ),
        React.createElement(
          Select,
          {
            defaultValue: this.valuesCache.headings,
            maxItems: '6',
            itemHeight: '40',
            onChange: this.onFontChange.bind(null, 'headings')
          },
          this.optionsCache
        )
      ),
      React.createElement(
        'div',
        { className: 'visual-sidebar-styling-row' },
        React.createElement(
          'div',
          { className: 'visual-sidebar-styling-label' },
          'Paragraphs:'
        ),
        React.createElement(
          Select,
          {
            defaultValue: this.valuesCache.paragraphs,
            maxItems: '6',
            itemHeight: '40',
            onChange: this.onFontChange.bind(null, 'paragraphs')
          },
          this.optionsCache
        )
      )
    );
  }
});

module.exports = FontSchemes;

},{"../../../../../../editor/js/component/controls/Select":86,"../../../../../../editor/js/component/controls/Select/SelectItem":85,"../../../../../../editor/js/config/fonts":94,"../../../../../../editor/js/global/Globals":96,"../../../../../../wireframes/bootstraps/utils/fontSchemes/get":255}],160:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    jQuery = (window.jQuery),
    FontSchemes = require('./FontSchemes'),
    ColorSchemes = require('./ColorSchemes');

var SelectColorScheme = React.createClass({
  displayName: 'SelectColorScheme',

  shouldComponentUpdate: function shouldComponentUpdate() {
    return false;
  },
  render: function render() {
    return React.createElement(
      'div',
      { className: 'visual-sidebar-styling' },
      React.createElement(FontSchemes, null),
      React.createElement(ColorSchemes, null)
    );
  }
});

module.exports = SelectColorScheme;

},{"./ColorSchemes":158,"./FontSchemes":159}],161:[function(require,module,exports){
'use strict';

var React = (window.React);

var Tabs = React.createClass({
    displayName: 'Tabs',

    render: function render() {
        var className = 'visual-sidebar-tab' + (this.props.active ? ' current' : '');
        return React.createElement(
            'li',
            { className: className, onClick: this.props.onClick },
            this.props.label
        );
    }
});

module.exports = Tabs;

},{}],162:[function(require,module,exports){
"use strict";

var React = (window.React);

var TabContent = React.createClass({
    displayName: "TabContent",

    render: function render() {
        return React.createElement(
            "div",
            { className: "visual-sidebar-tab-content" + this.props.tabContentState },
            this.props.children
        );
    }
});

module.exports = TabContent;

},{}],163:[function(require,module,exports){
'use strict';

var _ = (window._),
    React = (window.React),
    TabContent = require('./TabContent');

var Tabs = React.createClass({
    displayName: 'Tabs',

    getInitialState: function getInitialState() {
        return {
            activeIndex: 0
        };
    },
    onHeaderClick: function onHeaderClick(index) {
        if (index !== this.state.activeIndex) {
            this.setState({
                activeIndex: index
            });
        }
    },
    parseChildren: function parseChildren() {
        var headers = [],
            contents = [];

        _.each(this.props.children, function (item) {
            headers.push(item);
            if (item.props.children) {
                contents.push(React.createElement(TabContent, { children: item.props.children }));
            }
        });

        return { headers: headers, contents: contents };
    },
    renderHeaders: function renderHeaders(headers) {
        return _.map(headers, function (header, index) {
            return React.addons.cloneWithProps(header, {
                key: index,
                active: index === this.state.activeIndex,
                onClick: this.onHeaderClick.bind(null, index)
            });
        }, this);
    },
    renderContents: function renderContents(contents) {
        return _.map(contents, function (content, index) {
            return React.addons.cloneWithProps(content, {
                key: index,
                tabContentState: index === this.state.activeIndex ? ' content-show' : ' content-hide'
            });
        }, this);
    },
    render: function render() {
        var parsedChildren = this.parseChildren();
        return React.createElement(
            'div',
            { className: 'visual-sidebar-content-wrap' },
            React.createElement(
                'ul',
                { className: 'visual-sidebar-tabs' },
                this.renderHeaders(parsedChildren.headers)
            ),
            React.createElement(
                'div',
                { className: 'visual-sidebar-tab-content-wrap' },
                this.renderContents(parsedChildren.contents)
            )
        );
    }
});

module.exports = Tabs;

},{"./TabContent":162}],164:[function(require,module,exports){
'use strict';

var T = 'VisualSidebar',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualContainer = require('../../../../../editor/js/model/visual/VisualContainer'),
    Config = require('../../../../../editor/js/global/Config'),
    BlocksSortable = require('./BlocksSortable'),
    Styling = require('./Styling'),
    Tabs = require('./Tabs'),
    Tab = require('./Tabs/Tab');

ModelDefinition[T] = VisualContainer.ModelDefinition.extend({});

VisualDefinition[T] = VisualDefinition.extend({
	getInitialState: function getInitialState() {
		return {
			isOpened: false,
			isAnimated: true,
			isReordering: false,

			projectTitle: "Project Title"
		};
	},
	componentDidMount: function componentDidMount() {
		jQuery(this.getDOMNode()).on('closeSidebar.visual', this.close);
	},
	shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
		return this.props.value !== nextProps.value || !_.isEqual(this.state, nextState);
	},
	onOpenNavigationClick: function onOpenNavigationClick(event) {
		jQuery(this.getDOMNode()).trigger('navOverlay.visual');
		event.preventDefault();
	},
	onBlockRemoved: function onBlockRemoved() {
		// TODO: Temporary
		jQuery("#visualBarManager").trigger('visual.bar-out');
	},
	onBlocksReorderStart: function onBlocksReorderStart() {
		this.setState({ isReordering: true });
	},
	onBlocksReorderEnd: function onBlocksReorderEnd() {
		this.setState({ isReordering: false });
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var id = this.props.id;

		var sidebarClassName = 'visual-sidebar-block';
		sidebarClassName += this.state.isOpened || this.state.isReordering ? ' visual-sidebar-block-visible' : '';
		sidebarClassName += this.state.isReordering ? ' visual-sidebar-block-reordering' : '';
		sidebarClassName += this.state.isAnimated ? '' : ' visual-sidebar-block-without-animation';

		var originUrl = Config.get('originUrl');

		var toggleFunction = this.state.isOpened ? this.close : this.open;

		return React.createElement(
			'div',
			{ id: id, className: sidebarClassName, onMouseOver: this.open, onMouseLeave: this.close },
			React.createElement('div', { className: 'visual-sidebar-heading-trigger', onMouseOver: this.open }),
			React.createElement(
				'div',
				{ className: 'visual-sidebar-heading' },
				React.createElement(
					'div',
					{ className: 'visual-sidebar-title' },
					React.createElement(
						'a',
						{ href: originUrl, target: '_blank', className: 'visual-btn visual-btn-sm visual-btn-teal-outline' },
						'Preview'
					)
				),
				React.createElement(
					'div',
					{ className: 'visual-icon-cog-svg', onClick: this.onOpenNavigationClick, title: 'Settings' },
					React.createElement('div', { className: 'visual-icon-cog' })
				)
			),
			React.createElement(
				Tabs,
				null,
				React.createElement(
					Tab,
					{ label: 'Page Blocks' },
					React.createElement(BlocksSortable, {
						items: v,
						onItemsChange: this.props.onChange,
						onItemRemoved: this.onBlockRemoved,
						onDragStart: this.onBlocksReorderStart,
						onDragEnd: this.onBlocksReorderEnd
					})
				),
				React.createElement(
					Tab,
					{ label: 'Styling' },
					React.createElement(Styling, null)
				)
			),
			React.createElement(
				'div',
				{ className: 'visual-sidebar-footer' },
				React.createElement(
					'div',
					{ className: 'visual-sidebar-btn-open', onClick: toggleFunction },
					React.createElement('div', { className: 'visual-icon-arrow-save' })
				)
			)
		);
	},
	renderForView: function renderForView() {
		throw 'VisualSidebar is available in Edit mode only';
	},
	open: function open() {
		clearTimeout(this.timeoutId);
		this.setState({
			isOpened: true,
			isAnimated: true
		});
	},
	close: function close(animated) {
		// add a timeout for the opportunity to clear it
		// it prevents the case when sidebar closes
		// when the user's cursor left the sidebar by just a little
		this.timeoutId = setTimeout((function () {
			this.setState({
				isOpened: false,
				isAnimated: animated !== undefined ? animated : true
			});
		}).bind(this), 500);
	}
});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//     var VisualDefinition = require('module/name').VisualDefinition,
//     var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/global/Config":95,"../../../../../editor/js/model/visual/VisualContainer":155,"./BlocksSortable":157,"./Styling":160,"./Tabs":163,"./Tabs/Tab":161}],165:[function(require,module,exports){

},{}],166:[function(require,module,exports){
'use strict';

var T = 'Blog1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-blog1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: ''
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center blog1',
			items: [RichText.property({
				text: '<p>JANUARY 31, 2016</p>' + '<p>' + '<br />' + '</p>' + '<h2>How to build a stylish</h2>' + '<h2>landing page in minutes.</h2>'
			})]
		}),
		items2: Div.property({ // Column 2 Image
			className: 'col-xs-12 col-sm-10 col-center blog1-image',
			items: [CloneableByBarDiv.property({ // Clonable Images 1 element
				containerClassName: 'visual-dd-ignore',
				minItems: 0,
				maxItems: 1,
				items: [FluidImage.property({
					className: 'blog1-media',
					image: {
						src: 'assets/img/editor/blog/1.jpg',
						size: '945x*xR'
					},
					link: ''
				})]
			})]
		}),
		items3: Div.property({ // Column 3 Text & Button
			className: 'col-xs-12 col-sm-10 col-md-8 col-center blog1-second',
			items: [RichText.property({
				text: '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>' + '<p><br></p>' + '<p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.</p>' + '<p><br></p>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi.</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					type: 'outlined',
					color: 'computed',
					text: 'Read More'
				})]
			})]
		})
	},
	visual: {
		title: 'News Article',
		screenshot: 'visual/img/blocks/Blog1.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],167:[function(require,module,exports){
'use strict';

var T = 'Contacts1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormTextarea = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Textarea'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-contacts1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({
			className: 'col-xs-12 contacts1',
			items: [RichText.property({
				text: '<h2>Get In Touch</h2>'
			})]
		}),
		items2: Div.property({
			className: 'col-xs-12 col-sm-10 offset-sm-1 col-md-8 offset-md-2',
			items: [Div.property({
				className: 'contacts1-form-wrap bg-f6f8fa',
				items: [Form.property({
					columns: '2',
					items: [FormText.property({
						placeholder: 'Your Name',
						width: '1/2'
					}), FormSelect.property({
						placeholder: 'Gender',
						options: ['Male', 'Female'],
						width: '1/2'
					}), FormTextarea.property({
						placeholder: 'Your Message',
						width: '1'
					})],
					submit: {
						className: 'btn btn-square btn-width-2',
						color: 'computed',
						text: 'Submit Enquiry'
					}
				}), RichText.property({
					className: 'contacts1-second',
					text: '<p>* We don’t share your personal info with anyone. Check out our <a href="#">Privacy Policy</a>  for more information.</p>'
				})]
			})]
		})
	},
	visual: {
		title: 'Message Form',
		screenshot: 'visual/img/blocks/Contacts1.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Textarea":277,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],168:[function(require,module,exports){
'use strict';

var T = 'Contacts6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    EmbedMap = require('../../../../../wireframes/visual/shortcodes/EmbedMap'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    FormTextarea = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Textarea'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-contacts6'),
		sectionFullWidth: VisualBoolean.property(true),
		items1: Div.property({ // Column 2 Maps
			background: {
				image: {
					size: '750x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			className: 'col-xs-12 col-md-6 col-last-md contacts6-maps col-content-middle',
			items: [EmbedMap.property({
				map: '<iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7260.112614513197!2d-73.99994535975631!3d40.73439474649794!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0000000000000000%3A0xfa615edfd1b67e18!2sWashington+Square+Park!5e0!3m2!1sen!2s!4v1460365595994" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>'
			})]
		}),
		items2: Div.property({ // Column 1 Text & Form
			background: {
				image: {
					size: '750x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-ffffff',
				opacity: '90'
			},
			className: 'col-xs-12 col-md-6 col-first-md col-content-middle col-self-center',
			items: [Div.property({
				className: 'padding-vertical-170 text-center contacts6',
				items: [RichText.property({
					text: '<h2>Send us a message</h2>'
				}), Form.property({
					items: [FormText.property({
						placeholder: 'Your Name'
					}), FormSelect.property({
						placeholder: 'Gender',
						options: ['Male', 'Female']
					}), FormTextarea.property({
						placeholder: 'Message'
					})],
					submit: {
						className: 'btn btn-square btn-fluid',
						color: 'computed',
						text: 'Send Message'
					}
				})]
			})]
		})
	},
	visual: {
		title: 'Contacts with Map',
		screenshot: 'visual/img/blocks/Contacts6.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/EmbedMap":267,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Textarea":277,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],169:[function(require,module,exports){
'use strict';

var T = 'Features1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-222222',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 features1',
			items: [RichText.property({
				text: '<h2>That\'s not all there is</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-2 grid-md-4 grid-fixed cols-center-xs',
				columns: '4',
				items: [Div.property({ // Item 1
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-browser-streamline-window',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Intuitive page builder</h3>'
					})]
				}), Div.property({ // Item 2
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-arrow-streamline-target',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Built for conversions</h3>'
					})]
				}), Div.property({ // Item 3
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-book-dowload-streamline',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Thorough documentation</h3>'
					})]
				}), Div.property({ // Item 4
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-bubble-love-streamline-talk',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Elite author item</h3>'
					})]
				}), Div.property({ // Item 5
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-design-pencil-rule-streamline',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Flexible design</h3>'
					})]
				}), Div.property({ // Item 6
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-frame-picture-streamline',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Unique elements</h3>'
					})]
				}), Div.property({ // Item 7
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-map-streamline-user',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Support forum access</h3>'
					})]
				}), Div.property({ // Item 8
					className: 'features1-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-paint-bucket-streamline',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Simple customization</h3>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Icon Grid',
		screenshot: 'visual/img/blocks/Features1.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],170:[function(require,module,exports){
'use strict';

var T = 'Features10',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features10'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1 Image
			className: 'col-xs-12 col-sm-6 col-content-middle',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/4.jpg',
					size: '750x*xR'
				},
				link: ''
			})]
		}),
		items2: Div.property({ // Column 2 Text & Buttons
			className: 'col-xs-12 col-sm-5 offset-sm-1 features10 col-content-middle',
			items: [RichText.property({
				text: '<h2>Build smart, effective landing pages in minutes.</h2>' + '<p>' + '<br />' + '</p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem.</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-width-2',
					color: 'computed',
					text: 'Read More'
				})]
			})]
		})
	},
	visual: {
		title: 'Image Left',
		screenshot: 'visual/img/blocks/Features10.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],171:[function(require,module,exports){
'use strict';

var T = 'Features11',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features11'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionFullWidth: VisualBoolean.property(true),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({
			className: 'col-xs-12 col-sm-5 offset-sm-1 col-xl-4 offset-xl-2 features11 col-content-center',
			items: [RichText.property({
				text: '<h2>Build smart, effective landing pages in minutes.</h2>' + '<p><br></p>' + '<p>Upstart is a complete landing page solution for products and services. Combine different blocks to suit your style and purpose - it’s as simple click and edit.</p>'
			}), CloneableByBarDiv.property({
				containerClassName: 'buttons features11-button visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-lg btn-width-3',
					color: 'computed',
					text: 'Buy Upstart'
				})]
			})]
		}),
		items2: Div.property({
			className: 'col-xs-12 col-sm-6 col-md-6 col-lg-6 col-content-center',
			items: [FluidImage.property({
				className: 'features11-media',
				image: {
					src: 'assets/img/editor/header/7.png',
					size: '750x*xR'
				},
				link: ''
			})]
		})
	},
	visual: {
		title: 'Image Right with CTA',
		screenshot: 'visual/img/blocks/Features11.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],172:[function(require,module,exports){
'use strict';

var T = 'Features12',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features12'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: ''
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '70'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 features12',
			items: [RichText.property({
				text: '<h2>Tabbed Content With Icons</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-8 col-sm-10 col-md-8 col-lg-6 col-center features12-second',
			items: [CloneableByBarDiv.property({ // -- Cloneable
				containerClassName: 'grid-xs-2 grid-sm-4 grid-fixed cols-center-xs',
				items: [Div.property({ // Item 1
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-photo-pictures-streamline',
						className: 'icons-color-6dc77a',
						link: ''
					}), RichText.property({
						text: '<h3>PLAIN IMAGE</h3>'
					})]
				}), Div.property({ // Item 2
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-camera-streamline-video',
						className: 'icons-color-6dc77a',
						link: ''
					}), RichText.property({
						text: '<h3>VIDEO TAB</h3>'
					})]
				}), Div.property({ // Item 3
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-picture-streamline-1',
						className: 'icons-color-6dc77a',
						link: ''
					}), RichText.property({
						text: '<h3>IMAGE SLIDER</h3>'
					})]
				}), Div.property({ // Item 4
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-design-pencil-rule-streamline',
						className: 'icons-color-6dc77a',
						link: ''
					}), RichText.property({
						text: '<h3>TEXT TAB</h3>'
					})]
				})]
			})]
		}),
		items3: Div.property({ // Column 3
			className: 'col-xs-12 col-sm-10 col-md-8 col-center features12-image features12-third',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/features/1.jpg',
					size: '750x*xR'
				},
				link: ''
			}), RichText.property({
				text: '<h3>Increase Conversions with Upstart</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam</p>' + '<p>rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt </p>' + '<p>explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia </p>' + '<p>consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>'
			})]
		})
	},
	visual: {
		title: 'Tabs with Icons',
		screenshot: 'visual/img/blocks/Features12.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],173:[function(require,module,exports){
'use strict';

var T = 'Features19',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features19'),
		containerClassName: VisualString.property('padding-vertical-160'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: 'assets/img/editor/features/Bitmap7.jpg'
			},
			colorClassName: 'bg-ffffff',
			color: 'computed',
			opacity: '0'
		}),
		items1: Div.property({ // Column 1
			background: {
				image: {
					size: '750x*xR'
				},
				colorClassName: 'bg-ffffff',
				color: 'computed',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-7 col-content-middle',
			items: [Div.property({
				className: 'padding-vertical-80 features19',
				items: [RichText.property({
					text: '<h2>Build your website with tons of pre-made content blocks</h2>' + '<p><br></p>' + '<p>Upstart has a bright, flexible persona that can be adapted to</p>' + '<p>suit almost any use. </p>' + '<p><br></p>'
				})]
			})]
		}),
		items2: Div.property({ // Column 2
			background: {
				image: {
					size: '750x*xR'
				},
				colorClassName: 'bg-f8f8f8',
				color: 'computed',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-5 col-content-middle',
			items: [Div.property({
				className: 'padding-vertical-80 features19-second',
				items: [RichText.property({
					text: '<h3>Let’s talk about your business</h3>' + '<p><br></p>' + '<p>Get a quote within 24 hours.</p>'
				}), CloneableByBarDiv.property({ // -- Cloneable Button
					containerClassName: 'buttons visual-dd-ignore',
					itemClassName: 'btn-item',
					items: [Button.property({
						className: 'btn btn-rounded btn-width-2',
						text: 'Read More'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Two Text Column',
		screenshot: 'visual/img/blocks/Features19.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],174:[function(require,module,exports){
'use strict';

var T = 'Features2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features2'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 features2',
			items: [RichText.property({
				text: '<h2>Build stylish landing pages fast.</h2>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fixed cols-center-xs',
				columns: '3',
				items: [Div.property({ // Item 1
					className: 'features2-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-camera-streamline-video',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Beautiful header options</h3>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'features2-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-browser-streamline-window',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Intuitive page builder</h3>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.</p>'
					})]
				}), Div.property({ // Item 3
					className: 'features2-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-backpack-streamline-trekking',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Designed for many uses</h3>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Grid Icon Thirds',
		screenshot: 'visual/img/blocks/Features2.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],175:[function(require,module,exports){
'use strict';

var T = 'Features3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 features3 text-center',
			items: [RichText.property({
				text: '<h2>Upstart is a neat, feature-rich landing page template designed to showcase your product or service in style.</h2>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Item 1
					className: 'features3-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-dashboard-speed-streamline',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Launch in no time flat</h3>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'features3-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-computer-imac',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Increase conversions</h3>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo.</p>'
					})]
				}), Div.property({ // Item 3
					className: 'features3-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-design-graphic-tablet-streamline-tablet',
						className: 'icons-color-6dc77a'
					}), RichText.property({
						text: '<h3>Look good while doing it</h3>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Left Icon Thirds',
		screenshot: 'visual/img/blocks/Features3.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],176:[function(require,module,exports){
'use strict';

var T = 'Features4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-6dc77a',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 features4 text-center',
			items: [RichText.property({
				text: '<h2>Your next landing page is minutes away</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Item 1
					className: 'features4-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-design-pencil-rule-streamline',
						className: 'icons-color-a4dcac'
					}), RichText.property({
						text: '<h3>Intuitive Page Builder</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi.</p>' + '<p><br></p>' + '<p>Edit content in place</p>' + '<p>Assemble layouts in seconds</p>' + '<p>Re-arrange sections</p>' + '<p>Export directly to HTML</p>'
					})]
				}), Div.property({ // Item 2
					className: 'features4-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-envellope-mail-streamline',
						className: 'icons-color-a4dcac'
					}), RichText.property({
						text: '<h3>Slick, Flexible Design</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.</p>' + '<p><br></p>' + '<p>Edit content in place</p>' + '<p>Assemble layouts in seconds</p>' + '<p>Re-arrange sections</p>' + '<p>Export directly to HTML</p>'
					})]
				}), Div.property({ // Item 3
					className: 'features4-second',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-grid-lines-streamline',
						className: 'icons-color-a4dcac'
					}), RichText.property({
						text: '<h3>Built on Bootstrap 3</h3>' + '<p><br></p>' + '<p>It’s never been easier to create a unique and effective landing page. Build, edit and customize your landing page intuitively in-browser with BitBlox.</p>' + '<p><br></p>' + '<p>Edit content in place</p>' + '<p>Assemble layouts in seconds</p>' + '<p>Re-arrange sections</p>' + '<p>Export directly to HTML</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Lists with Icon',
		screenshot: 'visual/img/blocks/Features4.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],177:[function(require,module,exports){
'use strict';

var T = 'Features5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe1_3 = require('../../../../../wireframes/visual/wireframes/Wireframe1-3'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_3.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features5'),
		sectionFullWidth: VisualBoolean.property(true),

		items1: Div.property({ // Column 1
			background: {
				image: {
					size: '660x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-6dc77a',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-4 features5 col-content-middle',
			items: [Icon.property({
				color: 'computed',
				icon: 'lk-icon-picture-streamline-1',
				className: 'icons-color-a4dcac'
			}), RichText.property({
				text: '<h3>Intuitive page builder</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>'
			})]
		}),
		items2: Div.property({ // Column 2
			background: {
				image: {
					size: '660x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-7fce8b',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-4 features5 col-content-middle',
			items: [Icon.property({
				color: 'computed',
				icon: 'lk-icon-dashboard-speed-streamline',
				className: 'icons-color-b7e3bd'
			}), RichText.property({
				text: '<h3>Designed To Convert</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>'
			})]
		}),
		items3: Div.property({ // Column 3
			background: {
				image: {
					size: '660x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-92d59c',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-4 features5 col-content-middle',
			items: [Icon.property({
				color: 'computed',
				icon: 'lk-icon-ink-pen-streamline',
				className: 'icons-color-c9eace'
			}), RichText.property({
				text: '<h3>Truly Flexible Style</h3>' + '<p><br></p>' + '<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>'
			})]
		})
	},
	visual: {
		title: 'Expanding Icon Thirds',
		screenshot: 'visual/img/blocks/Features5.jpg'
	}
});

VisualDefinition[T] = Wireframe1_3.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-3":304}],178:[function(require,module,exports){
'use strict';

var T = 'Features6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features6'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f7f7f7',
			opacity: '100'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 features6 padding-vertical-80 padding-bot-0',
			items: [RichText.property({
				text: '<h2>Landing pages with style</h2>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed',
				columns: '2',
				items: [Div.property({ // Column 1
					className: 'features6-second',
					items: [RichText.property({
						text: '<h3>Is Upstart a CMS theme?</h3>' + '<p>No, Upstart is an template and Page Builder all-in-one. This means there are is no CMS to install and no database to manage. All content is controlled via the browser based page builder dealing purely in HTML.</p>'
					})]
				}), Div.property({ // Column 2
					className: 'features6-second',
					items: [RichText.property({
						text: '<h3>Do you provide support for Upstart?</h3>' + '<p>Yes - BitBlox provides support for Upstart via our dedicated support forum at <b><a href="http://www.bitblox.me/support">bitblox.me/support</a></b>. This includes general item support but not additional customisation services.</p>'
					})]
				}), Div.property({ // Column 3
					className: 'features6-second',
					items: [RichText.property({
						text: '<h3>Does Upstart have styling options ?</h3>' + '<p>Texts can be edited by changing fonts from Google\'s selection, icons can be picked from a generous collection, while colors can be adjusted using the integrated color picker.</p>'
					})]
				}), Div.property({ // Column 4
					className: 'features6-second',
					items: [RichText.property({
						text: '<h3>Are PSD files included in the download?</h3>' + '<p>While the PSD files are not included in the download package from BitBlox, you can contact us via our support forum at <b><a href="http://www.bitblox.me/support">bitblox.me/support</a></b> and we will happily provide them for you.</p>'
					})]
				}), Div.property({ // Column 5
					className: 'features6-second',
					items: [RichText.property({
						text: '<h3>How many landing pages can I create?</h3>' + '<p>You may create as many pages as you like per single project. This means that if you plan to use Upstart for another project, you will need to purchase an additional standard license.</p>'
					})]
				})]
			})]
		}),
		items3: Div.property({ // Row 3
			className: 'col-xs-12 features6-third padding-vertical-80',
			items: [RichText.property({
				text: '<h4>Still have questions? Tweet <a href="#">@bitblox</a> for answers</h4>'
			})]
		})
	},
	visual: {
		title: 'Half Grid FAQ',
		screenshot: 'visual/img/blocks/Features6.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],179:[function(require,module,exports){
'use strict';

var T = 'Features7',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features7'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 features7',
			items: [RichText.property({
				text: '<h2>Guiding Principles.</h2>'
			})]
		}),
		items2: Div.property({ // Row 1
			className: 'col-xs-12 col-md-10 col-lg-9 col-center',
			items: [CloneableByBlock.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed',
				columns: '2',
				items: [Div.property({ // Column 1
					className: 'features7-second',
					items: [RichText.property({
						text: '<h3>1. Simplicity Trumps All</h3>' + '<p>Over complicating the problem overcomplicates the solution. A focussed and strategic approach yields the most effective outcomes.</p>'
					})]
				}), Div.property({ // Column 2
					className: 'features7-second',
					items: [RichText.property({
						text: '<h3>2. Iterate Then Iterate</h3>' + '<p>Never rest on your laurels. Nothing of worth is perfected on first attempt - so we make it our mission to perfect every last detail.</p>'
					})]
				}), Div.property({ // Column 3
					className: 'features7-second',
					items: [RichText.property({
						text: '<h3>3. Deliver & Awe</h3>' + '<p>We take deadlines seriously. We\'re ready to deliver your next project on time and on budget, with results that blow you away.</p>'
					})]
				}), Div.property({ // Column 4
					className: 'features7-second',
					items: [RichText.property({
						text: '<h3>4. For The People</h3>' + '<p>We believe in collaboration and collegiality - relationships are at the core of our work both internally and with clients.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Half List FAQ',
		screenshot: 'visual/img/blocks/Features7.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],180:[function(require,module,exports){
'use strict';

var T = 'Features8',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features8'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1 Image
			className: 'col-xs-12 col-sm-6 col-content-middle',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/1.png',
					size: '750x*xR'
				},
				link: ''
			})]
		}),
		items2: Div.property({ // Column 2 Text & Buttons
			className: 'col-xs-12 col-sm-6 col-md-5 offset-md-1 features8 col-content-middle',
			items: [RichText.property({
				text: '<h2>Build a landing page </h2>' + '<h2>in a matter of minutes.</h2>' + '<p>' + '<br />' + '</p>' + '<p>Upstart ships with over 50 uniquely designed content blocks ready to be fitted out with your copy and images. Get a head start with one of the included page demos or start experimenting with your own layouts in BitBlox.</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-lg btn-width-3',
					color: 'computed',
					text: 'Read More'
				})]
			})]
		})
	},
	visual: {
		title: 'Image Left',
		screenshot: 'visual/img/blocks/Features8.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],181:[function(require,module,exports){
'use strict';

var T = 'Features9',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-features9'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1 Text & Button
			className: 'col-xs-12 col-sm-6 col-md-5 features9 col-content-middle',
			items: [RichText.property({
				text: '<h2>BitBlox</h2>' + '<h2>makes editing a breeze.</h2>' + '<p>' + '<br />' + '</p>' + '<p>With over 50 content blocks to choose from, the perfect layout is now even easier to achieve. Make visual adjustments on-the-fly to establish a unique look for your website with minimal effort.</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-width-2',
					color: 'computed',
					text: 'Read More'
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Image
			className: 'col-xs-12 col-sm-6 offset-md-1 col-content-middle',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/2.png',
					size: '750x*xR'
				},
				link: ''
			})]
		})
	},
	visual: {
		title: 'Image Right',
		screenshot: 'visual/img/blocks/Features9.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],182:[function(require,module,exports){
'use strict';

var T = 'Footer1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer1'),
		sectionFullWidth: VisualBoolean.property(true),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/footer/1.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '20'
		}),
		items1: Div.property({ // Row 1 Image
			className: 'col-xs-12',
			items: [CloneableByBarDiv.property({ // -- Cloneable Icon
				containerClassName: 'grid-xs-1 grid-ms-3 grid-sm-5 grid-fluid cols-center-xs',
				maxItems: 5,
				items: [Icon.property({
					color: 'computed',
					icon: 'lk-icon-facebook',
					className: 'icons-color-ffffff',
					link: ''
				}), Icon.property({
					color: 'computed',
					icon: 'lk-icon-twitter',
					className: 'icons-color-ffffff',
					link: ''
				}), Icon.property({
					color: 'computed',
					icon: 'lk-icon-google',
					className: 'icons-color-ffffff',
					link: ''
				})]
			})]
		}),
		items2: Div.property({ // Row 2 Text
			className: 'col-xs-12 col-sm-9 col-center text-center footer1',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-light.png',
					size: '440x190xR'
				},
				link: ''
			}), RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		})
	},
	visual: {
		title: 'Image Social',
		screenshot: 'visual/img/blocks/Footer1.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],183:[function(require,module,exports){
'use strict';

var T = 'Footer2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_3 = require('../../../../../wireframes/visual/wireframes/Wireframe1-3'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarList = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_3.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer2'),
		containerClassName: VisualString.property('padding-vertical-20'),
		sectionBackground: Background.property({
			toolbarProps: {
				menuBar: true
			},
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			opacity: '95'
		}),
		// row-1
		items1: Div.property({ // Column 1 Icon
			className: 'col-xs-12 col-sm-4 col-md-3 footer-col-left col-content-middle',
			items: [CloneableByBarList.property({ // Cloneable Icon
				containerClassName: 'socials-inline visual-dd-ignore',
				items: [Icon.property({
					color: 'computed',
					icon: 'lk-icon-facebook',
					className: 'icons-color-888888',
					link: ''
				}), Icon.property({
					color: 'computed',
					icon: 'lk-icon-twitter',
					className: 'icons-color-888888',
					link: ''
				}), Icon.property({
					color: 'computed',
					icon: 'lk-icon-youtube-alt',
					className: 'icons-color-888888',
					link: ''
				}), Icon.property({
					color: 'computed',
					icon: 'lk-icon-vimeo',
					className: 'icons-color-888888',
					link: ''
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Text
			className: 'col-xs-12 col-sm-4 col-md-6 text-center footer-col-center col-content-middle footer2',
			items: [RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		}),
		items3: Div.property({ // Column 3 Logo
			className: 'col-xs-12 col-sm-4 col-md-3 text-right footer-col-right col-content-middle',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-dark.png',
					size: '440x190xR'
				},
				link: ''
			})]
		})
	},
	visual: {
		title: 'Slim Social',
		screenshot: 'visual/img/blocks/Footer2.jpg'
	}
});

VisualDefinition[T] = Wireframe1_3.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList":293,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-3":304}],184:[function(require,module,exports){
'use strict';

var T = 'Footer3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Menu = require('../../../../../wireframes/visual/shortcodes/Menu'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		// Row 1
		items1: Div.property({ // Column Menu
			className: 'col-xs-12 text-center',
			items: [Menu.property({
				menuId: 'footer-menu'
			})]
		}),
		// Row 2
		items2: Div.property({ // Column Logo
			className: 'col-xs-12 text-center',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-dark.png',
					size: '440x190xR'
				},
				link: ''
			})]
		}),
		// Row 3
		items3: Div.property({ // Column Text
			className: 'col-xs-12 text-center footer3',
			items: [RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		})
	},
	visual: {
		title: 'Row Menu',
		screenshot: 'visual/img/blocks/Footer3.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Menu":283,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],185:[function(require,module,exports){
'use strict';

var T = 'Footer4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_2 = require('../../../../../wireframes/visual/wireframes/Wireframe3-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Divider = require('../../../../../wireframes/visual/shortcodes/Divider'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		// row-1
		items1: Div.property({ // Column 1
			className: 'col-xs-12 col-sm-4 col-md-3 offset-md-2 col-lg-2 offset-lg-3 footer-col-left',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-dark.png',
					size: '440x190xR'
				},
				link: ''
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12 col-sm-4 col-md-3 col-lg-2 footer4',
			items: [RichText.property({
				text: '<p>' + '<a href="#">News</a>' + '</p>' + '<p>' + '<a href="#">FAQ</a>' + '</p>' + '<p>' + '<a href="#">Privacy Policy</a>' + '</p>' + '<p>' + '<a href="#">Terms of Use</a>' + '</p>'
			})]
		}),
		items3: Div.property({ // Column 3
			className: 'col-xs-12 col-sm-4 col-md-3 col-lg-2 footer4',
			items: [RichText.property({
				text: '<p>' + '<a href="#">Facebook</a>' + '</p>' + '<p>' + '<a href="#">Twitter</a>' + '</p>' + '<p>' + '<a href="#">Instagram</a>' + '</p>'
			})]
		}),
		// row-2
		items4: Div.property({ // Column 2-1
			className: 'col-xs-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3',
			items: [Divider.property({
				className: 'divider-line'
			})]
		}),
		// row-3
		items5: Div.property({ // Column 3-1
			className: 'col-xs-12 text-center footer4-second',
			items: [RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		})
	},
	visual: {
		title: 'Column Menu',
		screenshot: 'visual/img/blocks/Footer4.jpg'
	}
});

VisualDefinition[T] = Wireframe3_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Divider":266,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-2":309}],186:[function(require,module,exports){
'use strict';

var T = 'Footer5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_4 = require('../../../../../wireframes/visual/wireframes/Wireframe2-4'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_4.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer5'),
		containerClassName: VisualString.property('padding-vertical-40'),
		sectionBackground: Background.property({
			toolbarProps: {
				menuBar: true
			},
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		// Row 1
		items1: Div.property({ // Column 1 Logo
			className: 'col-xs-12 col-sm-4 footer-col-left col-content-middle',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-dark.png',
					size: '440x190xR'
				},
				link: ''
			})]
		}),
		items2: Div.property({ // Column 2 Text
			className: 'col-xs-12 col-sm-4 text-center footer-col-center col-content-middle footer5',
			items: [RichText.property({
				text: '<p>Free 30 day trial - Start building now</p>'
			})]
		}),
		items3: Div.property({ // Column 3 Button
			className: 'col-xs-12 col-sm-4 text-center footer-col-right col-content-middle',
			items: [CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					color: 'computed',
					text: 'Join Today'
				})]
			})]
		}),
		// Row 2
		items4: Div.property({ // Column 2 Text
			className: 'col-xs-12 text-center footer5-second',
			items: [RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		})
	},
	visual: {
		title: 'Call to Action',
		screenshot: 'visual/img/blocks/Footer5.jpg'
	}
});

VisualDefinition[T] = Wireframe2_4.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-4":307}],187:[function(require,module,exports){
'use strict';

var T = 'Footer6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe2_4 = require('../../../../../wireframes/visual/wireframes/Wireframe2-4'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_4.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-footer6'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		// Row 1
		items1: Div.property({ // Column 1 Image
			className: 'col-xs-12 col-md-8 col-sm-6',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/footer/logo-dark.png',
					size: '440x190xR'
				},
				link: ''
			}), Form.property({
				items: [FormText.property({
					placeholder: 'Newsletter Signup',
					width: '1/4'
				})],
				submit: {
					className: 'btn btn-square',
					color: 'computed',
					text: 'Go',
					width: '1/4'
				}
			})]
		}),
		items2: Div.property({ // Column 2 Text
			className: 'col-xs-6 col-md-2 col-sm-3 footer6',
			items: [RichText.property({
				text: '<h3>' + '<b>MORE INFO</b>' + '</h3>' + '<p>' + '<a href="#">About</a>' + '</p>' + '<p>' + '<a href="#">News</a>' + '</p>' + '<p>' + '<a href="#">FAQ</a>' + '</p>' + '<p>' + '<a href="#">Privacy Policy</a>' + '</p>' + '<p>' + '<a href="#">Terms of Use</a>' + '</p>'
			})]
		}),
		items3: Div.property({ // Column 3 Text
			className: 'col-xs-6 col-sm-3 col-md-2 footer6',
			items: [RichText.property({
				text: '<h3>' + '<b>SOCIAL</b>' + '</h3>' + '<p>' + '<a href="#">Facebook</a>' + '</p>' + '<p>' + '<a href="#">Twitter</a>' + '</p>' + '<p>' + '<a href="#">Instagram</a>' + '</p>'
			})]
		}),
		// Row 2
		items4: Div.property({ // Column 1 Text
			className: 'col-xs-12 footer6-second',
			items: [RichText.property({
				text: '<p>© Copyright 2016 Medium Rare - All Rights Reserved</p>'
			})]
		})
	},
	visual: {
		title: 'Menu with Form',
		screenshot: 'visual/img/blocks/Footer6.jpg'
	}
});

VisualDefinition[T] = Wireframe2_4.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-4":307}],188:[function(require,module,exports){
'use strict';

var T = 'Header1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header1'),
		containerClassName: VisualString.property('padding-vertical-120'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/3.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '30'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center',
			items: [RichText.property({
				className: 'header1',
				text: '<h2>Build better landing pages</h2>' + '<p>Start today with a free 30 day trial - No credit card required.</p>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-lg btn-width-3',
					color: 'computed',
					text: 'Buy Upstart'
				})]
			}), RichText.property({
				className: 'header1-second',
				text: '<p>By continuting you agree to our</p>' + '<p>' + '<b>' + '<a href="#">Terms of Use</a>' + '</b>' + '</p>'
			})]
		})
	},
	visual: {
		title: 'One Liner On Image',
		screenshot: 'visual/img/blocks/Header1.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],189:[function(require,module,exports){
'use strict';

var T = 'Header10',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header10'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				src: '',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ecf0f3',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center header10',
			items: [RichText.property({
				text: '<h2>Intuitive landing pages have now arrived</h2>' + '<p>Building <i>stylish</i> landing pages has never been this simple.</p>'
			})]
		}),
		items2: Div.property({ // Column 2 Form
			className: 'col-xs-12 col-sm-11 col-md-8 col-lg-7 col-center text-center header10-second',
			items: [Form.property({
				columns: '3',
				formType: 'inline',
				items: [FormText.property({
					placeholder: 'Your Name',
					width: '1/3'
				}), FormSelect.property({
					placeholder: 'Gender',
					options: ['Male', 'Female'],
					width: '1/3'
				})],
				submit: {
					className: 'btn btn-square btn-fluid',
					color: 'computed',
					text: 'Start your free trial',
					width: '1/3'
				}
			}), RichText.property({
				text: '<p>* We don’t share your personal info with anyone. Check out our <a href="#"><b>Privacy Policy</b></a> for more information.</p>'
			})]
		}),
		items3: Div.property({ // Column 3 Image
			className: 'col-xs-12 col-md-10 col-center text-center',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/12.png',
					size: '900x*xR'
				},
				link: ''
			})]
		})
	},
	visual: {
		title: 'Form Top',
		screenshot: 'visual/img/blocks/Header10.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],190:[function(require,module,exports){
'use strict';

var T = 'Header12',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header12'),
		containerClassName: VisualString.property('padding-vertical-120'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/14.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '20'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 col-md-6 col-self-middle-md header12',
			items: [RichText.property({
				className: 'header12',
				text: '<h2>Build stylish landing pages in minutes with Upstart.</h2>' + '<p>Upstart allows you to assemble</p>' + '<p>beautiful, multi-purpose landing pages in</p>' + '<p>a matter of minutes.</p>'
			})]
		}),
		items2: Div.property({ // Column 2 Form
			className: 'col-xs-12 col-md-6 col-self-middle-md',
			items: [Div.property({
				className: 'header12-form',
				items: [CloneableByBlock.property({ // -- Cloneable Icon
					containerClassName: 'grid-fixed grid-xs grid-xs-1 header12-second',
					items: [Div.property({ // Item 1
						className: 'display-flex cols-top-xs',
						items: [Icon.property({
							color: 'computed',
							icon: 'lk-icon-browser-streamline-window',
							className: 'icons-color-ffffff'
						}), RichText.property({
							text: '<h3>Browser-based BitBlox Page Builder makes editing content simple and fun.</h3>'
						})]
					}), Div.property({ // Item 2
						className: 'display-flex',
						items: [Icon.property({
							color: 'computed',
							icon: 'lk-icon-brush-paint-streamline',
							className: 'icons-color-ffffff'
						}), RichText.property({
							text: '<h3>Tons of content blocks to give your landing page a unique and distinct look.</h3>'
						})]
					})]
				}), Form.property({
					items: [FormText.property({
						placeholder: 'Your Name'
					}), FormSelect.property({
						placeholder: 'Gender',
						options: ['Male', 'Female']
					})],
					submit: {
						className: 'btn btn-square btn-fluid',
						color: 'computed',
						text: 'Start your free trial'
					}
				}), RichText.property({
					className: 'header12-third',
					text: '<p>* We don’t share your personal info with anyone. Check out our <a href="#">Privacy Policy</a> for more information.</p>'
				})]
			})]
		})
	},
	visual: {
		title: 'Form Right',
		screenshot: 'visual/img/blocks/Header12.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],191:[function(require,module,exports){
'use strict';

var T = 'Header14',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header14'),
		containerClassName: VisualString.property('padding-vertical-120'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/16.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '30'
		}),
		items1: Div.property({ // Row 1 Text
			className: 'col-xs-12 text-center header14',
			items: [RichText.property({
				text: '<h2>Better landing pages - No fuss.</h2>' + '<p>Upstart makes assembling high quality landing pages utterly simple.</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<h3 style="letter-spacing: 0;" class="text-font-size-14 text-line-height-1-8">' + '<b>FREE 30 DAY TRIAL - NO CREDIT CARD REQUIRED</b>' + '</h3>'
			})]
		}),
		items2: Div.property({ // Row 2 Forms
			className: 'col-xs-12 col-sm-8 col-center text-center header14-second',
			items: [Form.property({
				items: [FormText.property({
					placeholder: 'Your Name'
				}), FormSelect.property({
					placeholder: 'Gender',
					options: ['Male', 'Female']
				})],
				submit: {
					className: 'btn btn-square btn-fluid',
					color: 'computed',
					text: 'Start your free trial'
				}
			}), RichText.property({
				text: '<p>* We don’t share your personal info with anyone. Check out our</p>' + '<p><a href="#"><b>Privacy Policy</b></a> for more information.</p>'
			})]
		})
	},
	visual: {
		title: 'Form On Image',
		screenshot: 'visual/img/blocks/Header14.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],192:[function(require,module,exports){
'use strict';

var T = 'Header15',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header15'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 col-sm-4 col-md-5 offset-md-1 col-lg-5 offset-lg-1 col-self-middle-sm text-left header15',
			items: [RichText.property({
				text: '<h2>Build a landing</h2>' + '<h2>page in minutes.</h2>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<i>“Purchasing Upstart was the easiest decision I’ve</i>' + '</p>' + '<p>' + '<i>ever had to make. The sheer flexibility of the builder </i>' + '</p>' + '<p>' + '<i>was what sold it for me.”</i>' + '</p>' + '<p>' + '<br />' + '</p>' + '<p>— James Hillier, Medium Rare</p>'
			})]
		}),
		items2: Div.property({ // Column 2 Form
			className: 'col-xs-12 col-sm-8 col-md-5 col-lg-5 col-self-middle-sm',
			items: [Div.property({
				className: 'header15-second',
				items: [RichText.property({
					text: '<h3>' + '<b>FREE 30 DAY TRIAL - NO CREDIT CARD REQUIRED</b>' + '</h3>'
				}), Form.property({
					items: [FormText.property({
						placeholder: 'Your Name'
					}), FormSelect.property({
						placeholder: 'Gender',
						options: ['Male', 'Female']
					})],
					submit: {
						className: 'btn btn-square btn-fluid',
						color: 'computed',
						text: 'Start your free trial'
					}
				}), RichText.property({
					text: '<p>* We don’t share your personal info with anyone.</p>' + '<p>Check out our <a href="#"><b>Privacy Policy</b></a> for more information.</p>'
				})]
			})]
		})
	},
	visual: {
		title: 'Contained Form',
		screenshot: 'visual/img/blocks/Header15.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],193:[function(require,module,exports){
'use strict';

var T = 'Header16',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    VideoModal = require('../../../../../wireframes/visual/shortcodes/VideoModal'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header16'),
		sectionFullWidth: VisualBoolean.property(true),
		items1: Div.property({ // Column 1 Text & Buttons
			background: {
				image: {
					size: '750x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-282828',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-6',
			items: [Div.property({
				className: 'padding-vertical-220',
				items: [RichText.property({
					className: 'header16',
					text: '<h2>Your next adventure begins</h2>' + '<h2>at the end of the trail.</h2>' + '<p><br></p>' + '<p>Leave the conveniences of modern life behind</p>' + '<p>and experience life without distraction.</p>' + '<p>Where we\'re going - we don\'t need roads.</p>'
				}), CloneableByBarDiv.property({
					containerClassName: 'buttons header16-button visual-dd-ignore',
					itemClassName: 'btn-item',
					items: [Button.property({
						className: 'btn btn-rounded btn-lg btn-width-3',
						color: 'computed',
						text: 'I\'ll get packing'
					})]
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Images & VideoIcon
			background: {
				image: {
					size: '750x*xR',
					src: 'assets/img/editor/header/17.jpg'
				},
				color: 'computed',
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			className: 'col-xs-12 col-sm-6 header16-first col-content-middle col-self-center',
			items: [CloneableByBarDiv.property({ // -- Cloneable VideoIcon
				containerClassName: 'header16-video visual-dd-ignore',
				maxItems: 1,
				minItems: 0,
				items: [VideoModal.property({
					video: {
						key: '161354505',
						type: 'vimeo'
					},
					iconSize: "icon-medium"
				})]
			})]
		})
	},
	visual: {
		title: 'Split Video Modal',
		screenshot: 'visual/img/blocks/Header16.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/VideoModal":289,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],194:[function(require,module,exports){
'use strict';

var T = 'Header17',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header17'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 col-md-10 col-center',
			items: [CloneableByBarDiv.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-md-5 grid-fixed cols-center-xs header17-image',
				items: [FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/1.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/2.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/3.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/4.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/5.png',
						size: '160x35xR'
					},
					link: ''
				})]
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12 text-center',
			items: [RichText.property({
				className: 'header17',
				text: '<h2>You\'re in good company</h2>' + '<p>Join thousands of satisfied customers using Upstart globally.</p>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-lg btn-width-3',
					color: 'computed',
					text: 'Buy Upstart'
				})]
			}), RichText.property({
				className: 'header17-second',
				text: '<p>By continuting you agree to our</p>' + '<p>' + '<b>' + '<a href="#">Terms of Use</a>' + '</b>' + '</p>'
			})]
		})
	},
	visual: {
		title: 'Affiliate Logos',
		screenshot: 'visual/img/blocks/Header17.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],195:[function(require,module,exports){
'use strict';

var T = 'Header19',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    VideoModal = require('../../../../../wireframes/visual/shortcodes/VideoModal'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header19'),
		containerClassName: VisualString.property('padding-vertical-120'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/27.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-292929',
			opacity: '30'
		}),
		items1: Div.property({ // Column 1 Text & Button
			className: 'col-xs-12 col-sm-8 header19',
			items: [RichText.property({
				className: 'header19',
				text: '<h2>Discussing future trends in</h2>' + '<h2>e-commerce and digital design</h2>' + '<p>' + '<br />' + '</p>' + '<p>' + '5th August 2016 @ Melbourne Convention Centre' + '</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-width-2',
					color: 'computed',
					text: 'Purchase Tickets'
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Text & Buttons
			className: 'col-xs-12 col-sm-4 text-center col-content-middle col-self-center',
			items: [CloneableByBarDiv.property({ // -- Cloneable VideoIcon
				containerClassName: 'header19-video visual-dd-ignore',
				maxItems: 1,
				minItems: 0,
				items: [VideoModal.property({
					video: {
						key: '161354505',
						type: 'vimeo'
					},
					iconSize: "icon-large"
				})]
			})]
		})
	},
	visual: {
		title: 'Right Video Modal',
		screenshot: 'visual/img/blocks/Header19.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/VideoModal":289,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],196:[function(require,module,exports){
'use strict';

var T = 'Header2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header2'),
		containerClassName: VisualString.property('padding-vertical-190'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/3.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '30'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center header2',
			items: [RichText.property({
				text: '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<h2>' + '<b>Build stylish landing pages in minutes with Upstart</b>' + '</h2>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>'
			})]
		})
	},
	visual: {
		title: 'Simple Text',
		screenshot: 'visual/img/blocks/Header2.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],197:[function(require,module,exports){
'use strict';

var T = 'Header21',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarList = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header21'),
		containerClassName: VisualString.property('padding-vertical-200'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/30.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-333333',
			opacity: '40'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center',
			items: [RichText.property({
				className: 'header21',
				text: '<h2>Samuel Thompson</h2>' + '<p>Web & Interaction Designer</p>'
			}), CloneableByBarList.property({
				containerClassName: 'socials-inline visual-dd-ignore',
				items: [Icon.property({
					icon: 'fa fa-github',
					color: 'computed',
					className: 'icons-color-ffffff',
					link: ''
				}), Icon.property({
					icon: 'fa fa-twitter',
					color: 'computed',
					className: 'icons-color-ffffff',
					link: ''
				}), Icon.property({
					icon: 'fa fa-instagram',
					color: 'computed',
					className: 'icons-color-ffffff',
					link: ''
				}), Icon.property({
					icon: 'fa fa-spotify',
					color: 'computed',
					className: 'icons-color-ffffff',
					link: ''
				})]
			})]
		})
	},
	visual: {
		title: 'One Liner Social',
		screenshot: 'visual/img/blocks/Header21.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList":293,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],198:[function(require,module,exports){
'use strict';

var T = 'Header22',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header22'),
		containerClassName: VisualString.property('padding-vertical-100'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: 'assets/img/editor/header/28.jpg'
			},
			color: 'computed',
			colorClassName: 'bg-292929',
			opacity: '0'
		}),
		items1: Div.property({ // Row 1 Text
			className: 'col-xs-12 text-center header22',
			items: [RichText.property({
				text: '<h2>Subscribe for a monthly roundup of best bits.</h2>' + '<p><br></p>' + '<p>Resources, interviews, competitions and more.</p>'
			})]
		}),
		items2: Div.property({ // Row 2 Form
			className: 'col-xs-12 col-sm-11 col-md-8 col-lg-7 col-center',
			items: [Form.property({
				columns: '3',
				formType: 'inline',
				items: [FormText.property({
					placeholder: 'Email Address',
					width: '1/3'
				}), FormSelect.property({
					placeholder: 'Gender',
					options: ['Male', 'Female'],
					width: '1/3'
				})],
				submit: {
					className: 'btn btn-square btn-fluid',
					color: 'computed',
					text: 'Subscribe',
					width: '1/3'
				}
			}), RichText.property({
				className: 'header22-second text-center',
				text: '<p>* We never share your information with third parties.</p>'
			})]
		}),
		items3: Div.property({ // Row 3 Images
			className: 'col-xs-12 col-sm-9 col-center',
			items: [CloneableByBarDiv.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-md-5 grid-fixed cols-center-xs header22-image',
				items: [FluidImage.property({ // Item 1
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/13.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({ // Item 2
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/14.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({ // Item 3
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/15.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({ // Item 4
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/16.png',
						size: '160x35xR'
					},
					link: ''
				})]
			})]
		})
	},
	visual: {
		title: 'Inline Form',
		screenshot: 'visual/img/blocks/Header22.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],199:[function(require,module,exports){
'use strict';

var T = 'Header25',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Countdown = require('../../../../../wireframes/visual/shortcodes/Countdown'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header25'),
		containerClassName: VisualString.property('padding-vertical-130'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/32.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-333333',
			opacity: '80'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 text-center header25',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/menu/2.png',
					size: '300x*xR'
				},
				link: ''
			}), RichText.property({
				text: '<p><br></p>' + '<p>October 3rd to 5th - San Francisco, California</p>' + '<p><br></p>' + '<p><br></p>' + '<h2>Bringing together the web\'s most</h2>' + '<h2>forward thinking innovators.</h2>'
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12 col-md-10 col-center text-center',
			items: [Countdown.property({
				days: {
					number: 32,
					label: 'DAYS'
				},
				hours: {
					number: 16,
					label: 'HOURS'
				},
				minutes: {
					number: 49,
					label: 'MINUTES'
				},
				seconds: {
					number: 32,
					label: 'SECONDS'
				}
			})]
		})
	},
	visual: {
		title: 'Inline Countdown',
		screenshot: 'visual/img/blocks/Header25.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Countdown":264,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],200:[function(require,module,exports){
'use strict';

var T = 'Header3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    VideoModal = require('../../../../../wireframes/visual/shortcodes/VideoModal'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/5.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '0'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center header3',
			items: [RichText.property({
				text: '<h2>Create <i>Better</i> Landing Pages.</h2>' + '<p>Upstart is a complete landing page solution with unlimited possibilities.</p>'
			})]
		}),
		items2: Div.property({ // Column 2 Image
			className: 'col-xs-12 text-center',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/4.jpg',
					size: '675x*xR'
				},
				link: ''
			}), CloneableByBarDiv.property({ // -- Cloneable VideoIcon
				containerClassName: 'header3-video visual-dd-ignore',
				maxItems: 1,
				minItems: 0,
				items: [VideoModal.property({
					video: {
						key: '161354505',
						type: 'vimeo'
					},
					iconSize: "icon-medium"
				})]
			})]
		}),
		items3: Div.property({ // Column 3 Form
			className: 'col-xs-12 col-sm-11 col-md-8 col-lg-7 col-center text-center header3-second',
			items: [RichText.property({
				text: '<h3><b>SIGN UP NOW FOR A FREE 30 DAY TRIAL</b></h3>'
			}), Form.property({
				columns: '3',
				formType: 'inline',
				items: [FormText.property({
					placeholder: 'Your Name',
					width: '1/3'
				}), FormSelect.property({
					placeholder: 'Gender',
					options: ['Male', 'Female'],
					width: '1/3'
				})],
				submit: {
					className: 'btn btn-square btn-fluid',
					color: 'computed',
					text: 'Start your free trial',
					width: '1/3'
				}
			}), RichText.property({
				text: '<p>* We don’t share your personal info with anyone. Check out our <a href="#"><b>Privacy Policy</b></a> for more information.</p>'
			})]
		})
	},
	visual: {
		title: 'Fullscreen Inline Video',
		screenshot: 'visual/img/blocks/Header3.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/VideoModal":289,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],201:[function(require,module,exports){
'use strict';

var T = 'Header4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    VideoModal = require('../../../../../wireframes/visual/shortcodes/VideoModal'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header4'),
		sectionFullWidth: VisualBoolean.property(true),
		items1: Div.property({ // Column 1
			background: {
				image: {
					size: '750x*xR',
					src: 'assets/img/editor/header/6.jpg'
				},
				color: 'computed',
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			className: 'col-xs-12 col-sm-6 header4-first col-content-middle col-self-center',
			items: [CloneableByBarDiv.property({ // -- Cloneable VideoIcon
				containerClassName: 'header4-video visual-dd-ignore',
				maxItems: 1,
				minItems: 0,
				items: [VideoModal.property({
					video: {
						key: '161354505',
						type: 'vimeo'
					},
					iconSize: "icon-medium"
				})]
			})]
		}),
		items2: Div.property({ // Column 2
			background: {
				image: {
					size: '750x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-ecf0f3',
				opacity: '100'
			},
			className: 'col-xs-12 col-sm-6',
			items: [Div.property({
				className: 'padding-vertical-120',
				items: [RichText.property({
					className: 'header4',
					text: '<h2>Stylish landing pages without the fuss.</h2>' + '<p>' + '<br />' + '</p>' + '<p>Build your next landing page in minutes</p>' + '<p>with Upstart and BitBlox.</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br />' + '</p>' + '<p>' + '<br>' + '</p>' + '<h3 style="letter-spacing: 0;" class="text-font-size-14 text-line-height-1-8">' + '<b>' + '<span class="colorPicker" style="color: #222222">FREE 30 DAY TRIAL - NO CREDIT CARD REQUIRED</span>' + '</b>' + '</h3>'
				}), Form.property({
					items: [FormText.property({
						placeholder: 'Your Name'
					}), FormSelect.property({
						placeholder: 'Gender',
						options: ['Male', 'Female']
					})],
					submit: {
						className: 'btn btn-square btn-fluid',
						color: 'computed',
						text: 'Start your free trial'
					}
				}), RichText.property({
					className: 'header4-second',
					text: '<p>* We don’t share your personal info with anyone. Check out</p>' + '<p>our <a href="#"><b>Privacy Policy</b></a> for more information.</p>'
				})]
			})]
		})
	},
	visual: {
		title: 'Split Video Modal',
		screenshot: 'visual/img/blocks/Header4.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/VideoModal":289,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],202:[function(require,module,exports){
'use strict';

var T = 'Header5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header5'),
		containerClassName: VisualString.property('padding-vertical-120 padding-bot-0'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-6dc77a',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center header5',
			items: [RichText.property({
				text: '<h2>Design, Share, <b>Inspire.</b></h2>' + '<p>Build stylish landing pages in minutes with Upstart</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-width-1 btn-base-color-92d59c',
					color: 'computed',
					text: 'Read More'
				}), Button.property({
					className: 'btn btn-rounded btn-width-1',
					type: 'outlined',
					color: '#ffffff',
					text: 'More Info'
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Image
			className: 'col-xs-12 text-center',
			items: [FluidImage.property({
				image: {
					src: 'assets/img/editor/header/8.png',
					size: '1200x*xR'
				},
				link: ''
			})]
		})
	},
	visual: {
		title: 'Product Shot',
		screenshot: 'visual/img/blocks/Header5.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],203:[function(require,module,exports){
'use strict';

var T = 'Header6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header6'),
		containerClassName: VisualString.property('padding-vertical-160'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/9.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '30'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center header6',
			items: [RichText.property({
				text: '<h2>Basic Page Header</h2>'
			})]
		})
	},
	visual: {
		title: 'Basic Title with image',
		screenshot: 'visual/img/blocks/Header6.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],204:[function(require,module,exports){
'use strict';

var T = 'Header7',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header7'),
		containerClassName: VisualString.property('padding-vertical-200'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 col-center header7',
			items: [RichText.property({
				text: '<h2>' + '<b>WHAT MAKES UPSTART UNIQUE?</b>' + '</h2>' + '<p><br></p>' + '<p>Upstart is a complete landing page solution for</p>' + '<p>products and services. Combine different blocks to suit</p>' + '<p>your style and purpose - it’s as simple as click and edit.</p>'
			}), CloneableByBarDiv.property({ // -- Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					type: 'outlined',
					color: 'computed',
					text: 'Learn More »'
				})]
			})]
		})
	},
	visual: {
		title: 'Large Paragraph',
		screenshot: 'visual/img/blocks/Header7.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],205:[function(require,module,exports){
'use strict';

var T = 'Header9',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    VideoModal = require('../../../../../wireframes/visual/shortcodes/VideoModal'),
    Form = require('../../../../../wireframes/visual/shortcodes/Form'),
    FormText = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text'),
    FormSelect = require('../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-header9'),
		containerClassName: VisualString.property('padding-vertical-120 col-content-between'),
		sectionBackground: Background.property({
			image: {
				src: 'assets/img/editor/header/11.jpg',
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '20'
		}),
		items1: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center header9',
			items: [RichText.property({
				text: '<h2>Better landing pages</h2>' + '<p>Upstart is the simplest way to build your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Column 2 Video
			className: 'col-xs-12 text-center',
			items: [CloneableByBarDiv.property({ // -- Cloneable VideoIcon
				containerClassName: 'padding-vertical-150 visual-dd-ignore',
				maxItems: 1,
				minItems: 0,
				items: [VideoModal.property({
					video: {
						key: '161354505',
						type: 'vimeo'
					},
					iconSize: "icon-large"
				})]
			})]
		}),
		items3: Div.property({ // Column 3 Form
			className: 'col-xs-12 col-sm-11 col-md-8 col-lg-7 col-center text-center header9-second',
			items: [RichText.property({
				text: '<h3><b>SIGN UP NOW FOR A FREE 30 DAY TRIAL</b></h3>'
			}), Form.property({
				columns: '3',
				formType: 'inline',
				items: [FormText.property({
					placeholder: 'Your Name',
					width: '1/3'
				}), FormSelect.property({
					placeholder: 'Gender',
					options: ['Male', 'Female'],
					width: '1/3'
				})],
				submit: {
					className: 'btn btn-square btn-fluid',
					color: 'computed',
					text: 'Start your free trial',
					width: '1/3'
				}
			}), RichText.property({
				text: '<p>* We don’t share your personal info with anyone. Check out our <a href="#"><b>Privacy Policy</b></a> for more information.</p>'
			})]
		})
	},
	visual: {
		title: 'Fullscreen Modal Video',
		screenshot: 'visual/img/blocks/Header9.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Form":273,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Select":275,"../../../../../wireframes/visual/shortcodes/Form/itemTypes/Text":276,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/VideoModal":289,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],206:[function(require,module,exports){
'use strict';

var T = 'Menu6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_3 = require('../../../../../wireframes/visual/wireframes/Wireframe1-3'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarList = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    LogoImage = require('../../../../../wireframes/visual/shortcodes/LogoImage'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    Menu = require('../../../../../wireframes/visual/shortcodes/Menu');

ModelDefinition[T] = Wireframe1_3.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-menu6'),
		sectionBackground: Background.property({
			toolbarProps: {
				menuBar: true
			},
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-8 col-sm-3 header-col-left col-content-middle',
			items: [LogoImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/menu/1.png',
					size: '440x190xR'
				}
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-2 col-sm-6 header-col-center col-content-middle',
			items: [Menu.property({
				menuId: 'header-menu'
			})]
		}),
		items3: Div.property({ // Column 3
			className: 'col-xs-1 col-sm-3 header-col-right col-content-middle',
			items: [CloneableByBarList.property({ // Cloneable Icon
				containerClassName: 'socials-inline visual-dd-ignore',
				items: [Icon.property({
					color: '#00a0d1',
					icon: 'lk-icon-twitter',
					link: ''
				}), Icon.property({
					color: '#3b5998',
					icon: 'lk-icon-facebook',
					link: ''
				}), Icon.property({
					color: '#ea4c89',
					icon: 'icon-line2-social-dribbble',
					link: ''
				})]
			})]
		})
	},
	visual: {
		title: 'Icons Bar',
		screenshot: 'visual/img/blocks/Menu6.jpg'
	}
});

VisualDefinition[T] = Wireframe1_3.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/LogoImage":282,"../../../../../wireframes/visual/shortcodes/Menu":283,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList":293,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-3":304}],207:[function(require,module,exports){
'use strict';

var T = 'Portfolio1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio1'),
		containerClassName: VisualString.property('padding-vertical-90'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1 Images
			className: 'col-xs-12 col-sm-6 col-content-middle',
			items: [CloneableByBarDiv.property({ // -- Cloneable Images
				containerClassName: 'grid-xs-1 grid-ms-2 grid-sm-2 grid-md-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Item 1
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/1.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 2
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/2.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 3
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/3.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 4
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/4.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 5
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/5.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 6
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/6.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				})]
			})]
		}),
		items2: Div.property({ // Column 2 Text
			className: 'col-xs-12 col-sm-6 portfolio1 col-content-middle text-center',
			items: [RichText.property({
				text: '<p style="font-weight: 300; letter-spacing: 2px;" class="text-font-size-14">' + '<span class="colorPicker" style="color: #222222">INSTAGRAM</span>' + '</p>' + '<h2>We\'re Snap Happy</h2>' + '<p>' + '<br />' + '</p>' + '<p>Stay connected with us <a href="#"><b>@mrareweb</b></a> for update</p>' + '<p>and super special exclusive offers.</p>'
			})]
		})
	},
	visual: {
		title: 'Instagram Grid',
		screenshot: 'visual/img/blocks/Portfolio1.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],208:[function(require,module,exports){
'use strict';

var T = 'Portfolio2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    ImageCaption = require('../../../../../wireframes/visual/shortcodes/ImageCaption'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio2'),
		containerClassName: VisualString.property('padding-vertical-120'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 2 Image
			className: 'col-xs-12',
			items: [CloneableByBarDiv.property({ // Clonable Images
				containerClassName: 'portfolio2-wrap visual-dd-ignore',
				maxItems: 3,
				items: [ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/7.jpg',
						size: '1140x840xC'
					},
					link: ''
				}), ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/8.jpg',
						size: '1140x840xC'
					},
					link: ''
				}), ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/9.jpg',
						size: '1140x840xC'
					},
					link: ''
				})]
			})]
		}),
		items2: Div.property({ // Column 1 Text
			className: 'col-xs-12 text-center portfolio2',
			items: [RichText.property({
				text: '<h2>Showcase your product\'s features</h2>' + '<p>' + '<br />' + '</p>' + '<p>Upstart fuses the traditional landing page with stylish, modern web design.</p>' + '<p>Clear, refined looks and sales-centric elements combine to produce smart</p>' + '<p>landing pages ideal for today\'s products and services.</p>'
			})]
		})
	},
	visual: {
		title: 'Image Carousel',
		screenshot: 'visual/img/blocks/Portfolio2.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/ImageCaption":281,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],209:[function(require,module,exports){
'use strict';

var T = 'Portfolio3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 portfolio3',
			items: [RichText.property({
				text: '<h2>Upstart is a neat, feature-rich landing page template designed to showcase your product or service in style.</h2>' + '<p><br></p>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fixed cols-center-xs',
				columns: '3',
				items: [Div.property({ // Item 1
					className: 'portfolio3-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/portfolio/10-360x240.jpg',
							size: '360x240xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Unique, Engaging Style</h3>' + '<p>Upstart has a bright, flexible persona that can be adapted to suit almost any use. Use Upstart to sell or create a simple business website.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'portfolio3-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/portfolio/11-360x240.jpg',
							size: '360x240xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Built for mobile and up</h3>' + '<p>Tested comprehensively on a number of mobile devices, Upstart is well prepared to impress your mobile audience.</p>'
					})]
				}), Div.property({ // Item 3
					className: 'portfolio3-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/portfolio/12-360x240.jpg',
							size: '360x240xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>BitBlox Builder included</h3>' + '<p>BitBlox\'s most popular page builder just keeps getting better, Smart controls and font options give you complete control.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Grid Image Thirds',
		screenshot: 'visual/img/blocks/Portfolio3.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],210:[function(require,module,exports){
'use strict';

var T = 'Portfolio4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 col-center portfolio4 text-center',
			items: [RichText.property({
				text: '<h2>Build smart, effective landing pages fast.</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12 col-sm-10 col-md-8 col-center',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed',
				columns: '2',
				items: [Div.property({ // Item 1
					className: 'portfolio4-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/portfolio/13-360x240.jpg',
							size: '360x240xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Unique, Engaging Style</h3>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'portfolio4-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/portfolio/14-360x240.jpg',
							size: '360x240xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Slick, flexible blocks</h3>' + '<p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Centered Image Thirds',
		screenshot: 'visual/img/blocks/Portfolio4.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],211:[function(require,module,exports){
'use strict';

var T = 'Portfolio5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio5'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 2 Text
			className: 'col-xs-12 col-sm-6 portfolio5 text-center col-content-middle',
			items: [RichText.property({
				text: '<p style="font-weight: 300; letter-spacing: 2px;" class="text-font-size-14">' + '<span class="colorPicker" style="color:#222222">INSTAGRAM</span>' + '</p>' + '<h2>Feast your eyes</h2>' + '<p>' + '<br />' + '</p>' + '<p>Stay connected with us <a href="#"><b>@upstartcater</b></a> for update</p>' + '<p>and super special exclusive offers.</p>'
			})]
		}),
		items2: Div.property({ // Column 1 Images
			className: 'col-xs-12 col-sm-6 col-content-middle',
			items: [CloneableByBarDiv.property({ // -- Cloneable Images
				containerClassName: 'grid-xs-1 grid-ms-2 grid-sm-2 grid-md-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Item 1
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/1.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 2
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/2.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 3
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/3.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 4
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/4.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 5
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/5.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				}), Div.property({ // Item 6
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/portfolio/6.jpg',
							size: '400x368xC'
						},
						link: ''
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Instagram Grid',
		screenshot: 'visual/img/blocks/Portfolio5.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],212:[function(require,module,exports){
'use strict';

var T = 'Portfolio6',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../../../editor/js/model/basic/boolean'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    ImageCaption = require('../../../../../wireframes/visual/shortcodes/ImageCaption'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-portfolio6'),
		sectionFullWidth: VisualBoolean.property(true),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Row 1 Text
			className: 'col-xs-12 col-sm-9 col-center portfolio6 padding-vertical-80',
			items: [RichText.property({
				text: '<h2>Upstart is a neat, feature-rich landing page template designed to showcase your product or service in style.</h2>' + '<p>' + '<br />' + '</p>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Row 2 Images
			className: 'col-xs-12',
			items: [CloneableByBarDiv.property({ // Clonable Images
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fluid caption-images',
				itemClassName: 'image-caption-list portfolio6-second',
				items: [ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/small7.jpg',
						size: '866x577xC'
					},
					link: '',
					items: [RichText.property({
						text: '<h3>Brooklyn, NY</h3>' + '<p>Our Brooklyn office features fine Travertine floors and hardwood office kit.</p>'
					})]
				}), ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/small8.jpg',
						size: '866x577xC'
					},
					link: '',
					items: [RichText.property({
						text: '<h3>Montauk, NY</h3>' + '<p>Our Montauk office is the creative epicenter of the entire operation.</p>'
					})]
				}), ImageCaption.property({
					image: {
						src: 'assets/img/editor/portfolio/small9.jpg',
						size: '866x577xC'
					},
					link: '',
					items: [RichText.property({
						text: '<h3>San Francisco, CA</h3>' + '<p>Known affectionately as "The Best In The West" our San Fran abode is pure class.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Image Tile Thirds',
		screenshot: 'visual/img/blocks/Portfolio6.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/boolean":138,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/ImageCaption":281,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],213:[function(require,module,exports){
'use strict';

var T = 'Pricing1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-price1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'conputed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 price1',
			items: [RichText.property({
				text: '<h2>Simple plans - No fuss.</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-line cols-center-xs grid-nomargin price1-wrap',
				maxItems: 5,
				items: [Div.property({ // Item 1
					className: 'col-inner',
					items: [Icon.property({
						color: 'conputed',
						icon: 'lk-icon-man-people-streamline-user',
						className: 'icons-color-e0e0e0'
					}), RichText.property({
						className: 'price1-second',
						text: '<h3>RIDING SOLO</h3>'
					}), Div.property({
						className: 'price1-head',
						items: [Text.property({
							className: 'price1-currency',
							text: '$'
						}), Text.property({
							className: 'price1-amount',
							text: '19'
						}), Text.property({
							className: 'price1-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price1-second',
						text: '<p>Single use licence</p>' + '<p>perfect for freelancers</p>'
					})]
				}), Div.property({ // Item 2
					className: 'col-inner col-inner-star bg-6dc77a',
					items: [Icon.property({
						color: 'conputed',
						icon: 'lk-icon-notebook-streamline',
						className: 'icons-color-e0e0e0'
					}), RichText.property({
						className: 'price1-second',
						text: '<h3>TEAM EFFORT</h3>'
					}), Div.property({
						className: 'price1-head',
						items: [Text.property({
							className: 'price1-currency',
							text: '$'
						}), Text.property({
							className: 'price1-amount',
							text: '49'
						}), Text.property({
							className: 'price1-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price1-second',
						text: '<p>Up to 5 licences</p>' + '<p>Great for small studios.</p>'
					})]
				}), Div.property({ // Item 3
					className: 'col-inner',
					items: [Icon.property({
						color: 'conputed',
						icon: 'lk-icon-home-house-streamline',
						className: 'icons-color-e0e0e0'
					}), RichText.property({
						className: 'price1-second',
						text: '<h3>BIG BUSINESS</h3>'
					}), Div.property({
						className: 'price1-head',
						items: [Text.property({
							className: 'price1-currency',
							text: '$'
						}), Text.property({
							className: 'price1-amount',
							text: '79'
						}), Text.property({
							className: 'price1-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price1-second',
						text: '<p>Up to 20 licences. Suitable for</p>' + '<p>large businesses.</p>'
					})]
				}), Div.property({ // Item 4
					className: 'col-inner',
					items: [Icon.property({
						color: 'conputed',
						icon: 'lk-icon-factory-lift-streamline-warehouse',
						className: 'icons-color-e0e0e0'
					}), RichText.property({
						className: 'price1-second',
						text: '<h3>MEGACORP</h3>'
					}), Div.property({
						className: 'price1-head',
						items: [Text.property({
							className: 'price1-currency',
							text: '$'
						}), Text.property({
							className: 'price1-amount',
							text: '99'
						}), Text.property({
							className: 'price1-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price1-second',
						text: '<p>Up to 50 licences. Made for</p>' + '<p>multi-nationals.</p>'
					})]
				})]
			})]
		}),
		items3: Div.property({ // Column 1
			className: 'col-xs-12 price1-second',
			items: [RichText.property({
				text: '<p>Need additional pricing info? <a href="#"><b>Get in touch</b></a> for custom and high-volume pricing.</p>'
			})]
		})

	},
	visual: {
		title: 'Four Plans',
		screenshot: 'visual/img/blocks/Pricing1.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/Text":288,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],214:[function(require,module,exports){
'use strict';

var T = 'Pricing2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-price2'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: 'assets/img/editor/price/1.jpg'
			},
			color: 'computed',
			colorClassName: 'bg-202227',
			opacity: '60'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 text-center price2',
			items: [RichText.property({
				text: '<h2>Simple plans - No fuss.</h2>'
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-line cols-center-xs grid-nomargin price2-wrap',
				maxItems: 4,
				items: [Div.property({ // Item 1
					className: 'col-inner',
					items: [RichText.property({
						className: 'price2-second',
						text: '<h3>STARTER</h3>'
					}), Div.property({
						className: 'price2-head',
						items: [Text.property({
							className: 'price2-currency',
							text: '$'
						}), Text.property({
							className: 'price2-amount',
							text: '29'
						}), Text.property({
							className: 'price2-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price2-third',
						text: '<p>Try free for 30 days</p>'
					}), CloneableByBarDiv.property({ // Cloneable
						toolbarProps: {
							addEvent: true,
							trigger: 'click',
							locked: 'true'
						},
						containerClassName: 'price2-five visual-dd-ignore',
						items: [Text.property({
							text: '20 GB Secure Online Storage'
						}), Text.property({
							text: '24/7 Online Support'
						}), Text.property({
							text: '30 User Logins'
						})]
					})]
				}), Div.property({ // Item 2
					className: 'col-inner col-inner-star bg-6dc77a',
					items: [RichText.property({
						className: 'price2-second',
						text: '<h3>PREMIUM</h3>'
					}), Div.property({
						className: 'price2-head',
						items: [Text.property({
							className: 'price2-currency',
							text: '$'
						}), Text.property({
							className: 'price2-amount',
							text: '69'
						}), Text.property({
							className: 'price2-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price2-third',
						text: '<p>Try free for 30 days</p>'
					}), CloneableByBarDiv.property({ // Cloneable
						toolbarProps: {
							addEvent: true,
							trigger: 'click',
							locked: 'true'
						},
						containerClassName: 'price2-five visual-dd-ignore',
						items: [Text.property({
							text: 'Unlimited Secure Online Storage'
						}), Text.property({
							text: '24/7 Online Support'
						}), Text.property({
							text: 'Unlimited User Logins'
						})]
					})]
				})]
			})]
		}),
		items3: Div.property({ // Row 3
			className: 'col-xs-12 price2-six text-center',
			items: [RichText.property({
				text: '<p>Need additional pricing info? <a href="#"><b>Get in touch</b></a> for custom and high-volume pricing.</p>'
			})]
		})
	},
	visual: {
		title: 'Two Plans',
		screenshot: 'visual/img/blocks/Pricing2.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/Text":288,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],215:[function(require,module,exports){
'use strict';

var T = 'Pricing3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_3 = require('../../../../../wireframes/visual/wireframes/Wireframe2-3'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Icon = require('../../../../../wireframes/visual/shortcodes/Icon'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_3.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-price3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '90'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 price3 padding-vertical-40 padding-top-0 text-center',
			items: [RichText.property({
				text: '<h2>Landing pages with style</h2>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Column 1
			className: 'col-xs-12 col-md-4 text-center',
			items: [RichText.property({
				className: 'price3-second',
				text: '<h3>ONE PRICE</h3>'
			}), Div.property({
				className: 'price3-head',
				items: [Text.property({
					className: 'price3-currency',
					text: '$'
				}), Text.property({
					className: 'price3-amount',
					text: '29'
				}), Text.property({
					className: 'price3-period',
					text: '/mo'
				})]
			}), RichText.property({
				className: 'price3-third',
				text: '<p>Try free for 30 days</p>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					color: 'computed',
					text: 'I want a slice'
				})]
			})]
		}),
		items3: Div.property({ // Column 2
			className: 'col-xs-12 col-md-8 col-content-middle',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed cols-start-xs text-left',
				columns: '2',
				items: [Div.property({ // Item 1
					className: 'price3-fourth display-flex',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-file-psd',
						className: 'icons-color-555555'
					}), RichText.property({
						text: '<h4>' + '<b>PSD FILE INCLUDED</b>' + '</h3>' + '<p>Just shoot us an email and we\'ll send you the link to the PSD files.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'price3-fourth display-flex',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-browser-full',
						className: 'icons-color-555555'
					}), RichText.property({
						text: '<h4>' + '<b>BROWSER BASED BUILDER</b>' + '</h3>' + '<p>BitBlox allows you to assemble layouts faster than ever.</p>'
					})]
				}), Div.property({ // Item 3
					className: 'price3-fourth display-flex',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-graph',
						className: 'icons-color-555555'
					}), RichText.property({
						text: '<h4>' + '<b>FLEXIBLE ELEMENTS</b>' + '</h3>' + '<p>With many options for each section type - Upstart is extremely flexible.</p>'
					})]
				}), Div.property({ // Item 4
					className: 'price3-fourth display-flex',
					items: [Icon.property({
						color: 'computed',
						icon: 'lk-icon-imac',
						className: 'icons-color-555555'
					}), RichText.property({
						text: '<h4>' + '<b>RESPONSIVE DESIGN</b>' + '</h4>' + '<p>Built on the Bootstrap 3 framework = Upstart is responsive out of the box.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'One Plan with Icons',
		screenshot: 'visual/img/blocks/Pricing3.jpg'
	}
});

VisualDefinition[T] = Wireframe2_3.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/Icon":279,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/Text":288,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-3":306}],216:[function(require,module,exports){
'use strict';

var T = 'Pricing4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-price4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: ''
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 col-sm-6 col-content-middle price4-col-1',
			items: [Div.property({ // Item 1
				className: 'col-inner bg-f6f8fa',
				items: [RichText.property({
					className: 'price4-second',
					text: '<h3>CORPORATE</h3>'
				}), Div.property({
					className: 'price4-head',
					items: [Text.property({
						className: 'price4-currency',
						text: '$'
					}), Text.property({
						className: 'price4-amount',
						text: '99'
					}), Text.property({
						className: 'price4-period',
						text: '/mo'
					})]
				}), RichText.property({
					className: 'price4-second',
					text: '<p>Try free for 30 days</p>'
				}), CloneableByBarDiv.property({ // Cloneable
					toolbarProps: {
						addEvent: true,
						trigger: 'click',
						locked: 'true'
					},
					containerClassName: 'price4-five visual-dd-ignore',
					items: [Text.property({
						text: 'Unlimited Secure Online Storage'
					}), Text.property({
						text: '24/7 Online Support'
					}), Text.property({
						text: 'Unlimited User Logins'
					})]
				}), CloneableByBarDiv.property({ // Cloneable Button
					containerClassName: 'buttons visual-dd-ignore',
					itemClassName: 'btn-item',
					items: [Button.property({
						className: 'btn btn-round btn-width-1',
						color: 'computed',
						text: 'I want a slice'
					})]
				})]
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12 col-sm-6 col-content-middle price4-col-2',
			items: [Div.property({
				className: 'col-inner',
				items: [RichText.property({
					className: 'price4',
					text: '<h2>Your first 30 days are on us.</h2>' + '<p><br></p>' + '<p style="font-style: italic">“Donec sed odio dui. Etiam porta sem malesuada magna mollis euismod. Donec id elit non mi porta gravida.”</p>'
				}), FixedImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						size: '80x80xC',
						src: 'assets/img/editor/testimonial/7.png'
					},
					link: ''
				}), RichText.property({
					className: 'price4-third',
					text: '<p style="font-style: italic">— Jon Hopkins, Immunity</p>'
				})]
			})]
		})
	},
	visual: {
		title: 'One Plan',
		screenshot: 'visual/img/blocks/Pricing4.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/Text":288,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],217:[function(require,module,exports){
'use strict';

var T = 'Pricing5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe3_1 = require('../../../../../wireframes/visual/wireframes/Wireframe3-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe3_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-price5'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 text-center price5',
			items: [RichText.property({
				text: '<h2>Simple pricing - No fuss.</h2>'
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-line cols-center-xs grid-nomargin price5-wrap',
				maxItems: 4,
				items: [Div.property({ // Item 1
					className: 'col-inner',
					items: [RichText.property({
						className: 'price5-second',
						text: '<h3>STARTER</h3>'
					}), Div.property({
						className: 'price5-head',
						items: [Text.property({
							className: 'price5-currency',
							text: '$'
						}), Text.property({
							className: 'price5-amount',
							text: '29'
						}), Text.property({
							className: 'price5-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price5-third',
						text: '<p>Try free for 30 days</p>'
					}), CloneableByBarDiv.property({ // Cloneable
						toolbarProps: {
							addEvent: true,
							trigger: 'click',
							locked: 'true'
						},
						containerClassName: 'price5-five visual-dd-ignore',
						items: [Text.property({
							text: '20 GB Secure Online Storage'
						}), Text.property({
							text: '24/7 Online Support'
						}), Text.property({
							text: '30 Unique User Logins'
						})]
					})]
				}), Div.property({ // Item 2
					className: 'col-inner col-inner-star bg-6dc77a',
					items: [RichText.property({
						className: 'price5-second',
						text: '<h3>BUSINESS</h3>'
					}), Div.property({
						className: 'price5-head',
						items: [Text.property({
							className: 'price5-currency',
							text: '$'
						}), Text.property({
							className: 'price5-amount',
							text: '59'
						}), Text.property({
							className: 'price5-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price5-third',
						text: '<p>Try free for 30 days</p>'
					}), CloneableByBarDiv.property({ // Cloneable
						toolbarProps: {
							addEvent: true,
							trigger: 'click',
							locked: 'true'
						},
						containerClassName: 'price5-five visual-dd-ignore',
						items: [Text.property({
							text: '80 GB Secure Online Storage'
						}), Text.property({
							text: '24/7 Online Support'
						}), Text.property({
							text: '70 Unique User Logins'
						})]
					})]
				}), Div.property({ // Item 3
					className: 'col-inner',
					items: [RichText.property({
						className: 'price5-second',
						text: '<h3>CORPORATE</h3>'
					}), Div.property({
						className: 'price5-head',
						items: [Text.property({
							className: 'price5-currency',
							text: '$'
						}), Text.property({
							className: 'price5-amount',
							text: '99'
						}), Text.property({
							className: 'price5-period',
							text: '/mo'
						})]
					}), RichText.property({
						className: 'price5-third',
						text: '<p>Try free for 30 days</p>'
					}), CloneableByBarDiv.property({ // Cloneable
						toolbarProps: {
							addEvent: true,
							trigger: 'click',
							locked: 'true'
						},
						containerClassName: 'price5-five visual-dd-ignore',
						items: [Text.property({
							text: 'Unlimited Secure Online Storage'
						}), Text.property({
							text: '24/7 Online Support'
						}), Text.property({
							text: 'Unlimited User Logins'
						})]
					})]
				})]
			})]
		}),
		items3: Div.property({ // Row 3
			className: 'col-xs-12 price5-six text-center',
			items: [RichText.property({
				text: '<p>Need additional pricing info? <a href="#"><b>Get in touch</b></a> for custom and high-volume pricing.</p>'
			})]
		})
	},
	visual: {
		title: 'Three Plans',
		screenshot: 'visual/img/blocks/Pricing5.jpg'
	}
});

VisualDefinition[T] = Wireframe3_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/Text":288,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe3-1":308}],218:[function(require,module,exports){
'use strict';

var T = 'Promobar1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-promobar1'),
		containerClassName: VisualString.property('padding-vertical-60'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center',
			items: [RichText.property({
				className: 'promobar1',
				text: '<h2>Build stylish landing pages in minutes</h2>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					type: 'outlined',
					color: 'computed',
					text: 'Take A Tour'
				})]
			}), RichText.property({
				className: 'promobar1-second',
				text: '<p>' + '<b>OR</b>' + '</p>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-width-1',
					color: 'computed',
					text: 'Buy Upstart'
				})]
			})]
		})
	},
	visual: {
		title: 'One Liner / Two Buttons',
		screenshot: 'visual/img/blocks/Promobar1.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],219:[function(require,module,exports){
'use strict';

var T = 'Promobar2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_2 = require('../../../../../wireframes/visual/wireframes/Wireframe1-2'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_2.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-promobar2'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '95'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 col-md-8 col-sm-7 promobar2 col-content-middle',
			items: [RichText.property({
				text: '<h2>Build better landing pages</h2>' + '<p>Start today with a free 30 day trial - No credit card required.</p>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12 col-md-4 col-sm-5 text-right col-content-middle',
			items: [CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-round btn-outline btn-width-1',
					color: 'computed',
					type: 'outlined',
					text: 'More Info'
				}), Button.property({
					className: 'btn btn-round btn-width-1',
					color: 'computed',
					text: 'Join Now'
				})]
			})]
		})
	},
	visual: {
		title: 'Short Strip',
		screenshot: 'visual/img/blocks/Promobar2.jpg'
	}
});

VisualDefinition[T] = Wireframe1_2.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-2":303}],220:[function(require,module,exports){
'use strict';

var T = 'Promobar3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-promobar3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 promobar3',
			items: [FluidImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/promobar/1.png',
					size: '90x90xR'
				},
				link: ''
			}), RichText.property({
				text: '<p>Back our Kickstarter campaign to recieve exclusive offers.</p>'
			})]
		})
	},
	visual: {
		title: 'Inline Image',
		screenshot: 'visual/img/blocks/Promobar3.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],221:[function(require,module,exports){
'use strict';

var T = 'Promobar4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-promobar4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR',
				src: 'assets/img/editor/promobar/2.jpg'
			},
			color: 'computed',
			colorClassName: 'bg-000000',
			opacity: '20'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12 text-center',
			items: [CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-lg btn-width-3',
					color: 'computed',
					text: 'Purchase Upstart'
				})]
			})]
		})
	},
	visual: {
		title: 'Button on Image',
		screenshot: 'visual/img/blocks/Promobar4.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],222:[function(require,module,exports){
'use strict';

var T = 'Slider1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    OwlCarouselItems = require('../../../../../wireframes/visual/shortcodes/OwlCarousel/Items'),
    Header2 = require('../Header2'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    OwlCarousel = require('../../../../../wireframes/visual/shortcodes/OwlCarousel'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = OwlCarousel.ModelDefinition.extend({
	properties: {
		className: VisualString.property('sec-slider1'),
		configKey: VisualString.property('Slider1.owlCarousel'),
		items: OwlCarouselItems.property([Header2.property({ // Slide 1
			sectionClassName: 'sec-header2',
			containerClassName: 'col-content-middle padding-vertical-80',
			sectionBackground: {
				image: {
					src: 'assets/img/editor/slider/1.jpg',
					size: '1920x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-000000',
				opacity: '40'
			},
			items1: { // Column 1
				className: 'col-xs-10 col-md-12 col-center col-content-middle text-center header2',
				items: [RichText.property({
					text: '<h2>Intuitive Page Builder</h2>' + '<p>' + '<br />' + '</p>' + '<p>Upstart fuses the traditional landing page with stylish, modern web design.</p>' + '<p>Clear, refined looks and sales-centric elements combine to produce smart</p>' + '<p>landing pages ideal for today\'s products and services.</p>'
				}), CloneableByBarDiv.property({ // -- Cloneable Button
					containerClassName: 'buttons visual-dd-ignore',
					itemClassName: 'btn-item',
					items: [Button.property({
						className: 'btn btn-rounded btn-width-1',
						color: 'computed',
						text: 'Read More'
					}), Button.property({
						className: 'btn btn-rounded btn-width-1',
						type: 'outlined',
						color: 'computed',
						text: 'More Info'
					})]
				})]
			}
		}), Header2.property({ // Slide 2
			sectionClassName: 'sec-header2',
			containerClassName: 'col-content-middle padding-vertical-80',
			sectionBackground: {
				image: {
					src: 'assets/img/editor/slider/2.jpg',
					size: '1920x*xR'
				},
				color: 'computed',
				colorClassName: 'bg-000000',
				opacity: '40'
			},
			items1: { // Column 1
				className: 'col-xs-10 col-md-12 col-center col-content-middle text-left header2',
				items: [RichText.property({
					text: '<h2>Flexible Blocks</h2>' + '<p>' + '<br />' + '</p>' + '<p>Upstart fuses the traditional landing page with stylish, modern web design.</p>' + '<p>Clear, refined looks and sales-centric elements combine to produce smart</p>' + '<p>landing pages ideal for today\'s products and services.</p>'
				}), CloneableByBarDiv.property({ // -- Cloneable Button
					containerClassName: 'buttons visual-dd-ignore',
					itemClassName: 'btn-item',
					items: [Button.property({
						className: 'btn btn-rounded btn-width-1',
						color: 'computed',
						text: 'Read More'
					}), Button.property({
						className: 'btn btn-rounded btn-width-1',
						type: 'outlined',
						color: 'computed',
						text: 'More Info'
					})]
				})]
			}
		})])
	},
	visual: {
		title: 'Fullscreen Slider',
		screenshot: 'visual/img/blocks/Slider1.jpg'
	}
});

VisualDefinition[T] = OwlCarousel.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/OwlCarousel":286,"../../../../../wireframes/visual/shortcodes/OwlCarousel/Items":285,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../Header2":196}],223:[function(require,module,exports){
'use strict';

var T = 'Slider2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    OwlCarouselItems = require('../../../../../wireframes/visual/shortcodes/OwlCarousel/Items'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    OwlCarousel = require('../../../../../wireframes/visual/shortcodes/OwlCarousel'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = OwlCarousel.ModelDefinition.extend({
	properties: {
		className: VisualString.property('sec-slider2'),
		configKey: VisualString.property('Slider2.owlCarousel'),
		items: OwlCarouselItems.property([Wireframe1_1.property({ // Slide 1
			sectionBackground: {
				image: {
					src: 'assets/img/editor/slider/4.jpg',
					size: '1920x*xR'
				},
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			items1: {
				items: []
			}
		}), Wireframe1_1.property({ // Slide 2
			sectionBackground: {
				image: {
					src: 'assets/img/editor/slider/5.jpg',
					size: '1920x*xR'
				},
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			items1: { // Column 1
				items: []
			}
		}), Wireframe1_1.property({ // Slide 3
			sectionBackground: {
				image: {
					src: 'assets/img/editor/slider/1.jpg',
					size: '1920x*xR'
				},
				colorClassName: 'bg-ffffff',
				opacity: '0'
			},
			items1: { // Column 1
				items: []
			}
		})])
	},
	visual: {
		title: 'Photo Slideshow',
		screenshot: 'visual/img/blocks/Slider2.jpg'
	}
});

VisualDefinition[T] = OwlCarousel.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/OwlCarousel":286,"../../../../../wireframes/visual/shortcodes/OwlCarousel/Items":285,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],224:[function(require,module,exports){
'use strict';

var T = 'Team1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-team1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12',
			items: [RichText.property({
				className: 'team1',
				text: '<h2>Small. Vibrant. Passionate.</h2>'
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // -- Cloneable
				containerClassName: 'grid-xs-1 grid-sm-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Item 1
					className: 'team1-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/team/1.jpg',
							size: '360x540xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Daniel Avery</h3>' + '<p>Founder & CEO. Having worked in some of New York\'s biggest agencies, Daniel\'s radical vision required a newfound venture.</p>'
					})]
				}), Div.property({ // Item 2
					className: 'team1-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/team/2.jpg',
							size: '360x540xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Joseph Ginsberg</h3>' + '<p>Creative Director and Co-Founder, Joseph\'s years of experience bring a unique and distinguished look to our varied client projects</p>'
					})]
				}), Div.property({ // Item 3
					className: 'team1-second',
					items: [FixedImage.property({
						image: {
							src: 'assets/img/editor/team/3.jpg',
							size: '360x540xC'
						},
						link: ''
					}), RichText.property({
						text: '<h3>Alice Cole</h3>' + '<p>Artistic Director and lover of cats, Alice\'s keen sense of style informs our overall visual direction. She has worked in agencies across the country.</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Grid Image Thirds',
		screenshot: 'visual/img/blocks/Team1.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],225:[function(require,module,exports){
'use strict';

var T = 'Team3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-team3'),
		containerClassName: VisualString.property('padding-vertical-100'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Column 1
			className: 'col-xs-12',
			items: [CloneableByBarDiv.property({ // Clonable Images
				containerClassName: 'grid-fixed cols-center-xs team3-wrap visual-dd-ignore',
				columns: 6,
				maxItems: 6,
				items: [FixedImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/team/avatar-small-1.png',
						size: '120x120xC'
					},
					link: ''
				}), FixedImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/team/avatar-small-2.png',
						size: '120x120xC'
					},
					link: ''
				}), FixedImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/team/avatar-small-3.png',
						size: '120x120xC'
					},
					link: ''
				}), FixedImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/team/avatar-small-4.png',
						size: '120x120xC'
					},
					link: ''
				})]
			})]
		}),
		items2: Div.property({ // Column 2
			className: 'col-xs-12 text-center team3',
			items: [RichText.property({
				text: '<h2>Built by designers, just for you.</h2>' + '<p><br></p>' + '<p>Upstart has a bright, flexible persona that can be adapted to suit almost any use. Use</p> ' + '<p>Upstart to sell or create a simple business website.</p>'
			}), CloneableByBarDiv.property({ // Cloneable Button
				containerClassName: 'buttons visual-dd-ignore',
				itemClassName: 'btn-item',
				items: [Button.property({
					className: 'btn btn-rounded btn-width-2',
					color: 'computed',
					text: 'Tell Me More'
				})]
			})]
		})
	},
	visual: {
		title: 'Team with avatar',
		screenshot: 'visual/img/blocks/Team3.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/Button":263,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],226:[function(require,module,exports){
'use strict';

var T = 'Testimonial1',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBarDiv = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText'),
    FluidImage = require('../../../../../wireframes/visual/shortcodes/FluidImage');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-testimonial1'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Row 1 Text
			className: 'col-xs-12 testimonial1',
			items: [RichText.property({
				text: '<h2>You\'re in good company</h2>' + '<p>' + '<br />' + '</p>' + '<p>Join thousands of satisfied customers using Upstart globally.</p>'
			})]
		}),
		items2: Div.property({ // Row 2 Images
			className: 'col-xs-12 col-sm-10 col-center',
			items: [CloneableByBarDiv.property({ // Clonable Images
				containerClassName: 'grid-xs-1 grid-sm-5 grid-fixed cols-center-xs',
				items: [FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/1.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/2.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/3.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/4.png',
						size: '160x35xR'
					},
					link: ''
				}), FluidImage.property({
					toolbarProps: {
						inside: false
					},
					image: {
						src: 'assets/img/editor/testimonial/5.png',
						size: '160x35xR'
					},
					link: ''
				})]
			})]
		})
	},
	visual: {
		title: 'Affiliate Logos',
		screenshot: 'visual/img/blocks/Testimonial1.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FluidImage":269,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv":291,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],227:[function(require,module,exports){
'use strict';

var T = 'Testimonial2',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-testimonial2'),
		containerClassName: VisualString.property('padding-vertical-70 padding-top-0'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 testimonial2 padding-vertical-70 padding-bot-0',
			items: [RichText.property({
				text: '<h2>Landing pages with style</h2>' + '<p>With multiple options for all sections - Upstart has the right stuff for your next landing page.</p>'
			})]
		}),
		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed cols-center-xs',
				items: [Div.property({ // Column 1
					className: 'testimonial2-second',
					items: [RichText.property({
						text: '<p style="text-align: center;" class="text-font-size-66 text-line-height-1">' + '<span style="color: #222222;">' + '<i>“</i>' + '</span>' + '<p>' + '<h3>' + '<i>Upstart enabled us to get our landing page live in under a day. It was a pure joy to use.</i>' + '</h3>' + '<p>' + '<br />' + '</p>' + '<p>' + '<i>— James Hillier, Medium Rare</i>' + '</p>'
					})]
				}), Div.property({ // Column 2
					className: 'testimonial2-second',
					items: [RichText.property({
						text: '<p style="text-align: center;" class="text-font-size-66 text-line-height-1">' + '<span style="color: #222222;">' + '<i>“</i>' + '</span>' + '<p>' + '<h3>' + '<i>The guys have created a truly special product here - Finally a builder that delivers!</i>' + '</h3>' + '<p>' + '<br />' + '</p>' + '<p>' + '<i>— Jon Hopkins, Immunity</i>' + '</p>'
					})]
				}), Div.property({ // Column 3
					className: 'testimonial2-second',
					items: [RichText.property({
						text: '<p style="text-align: center;" class="text-font-size-66 text-line-height-1">' + '<span style="color: #222222;">' + '<i>“</i>' + '</span>' + '<p>' + '<h3>' + '<i>We now have a go-to solution for our client’s landing pages. We love the flexibility</i>' + '</h3>' + '<p>' + '<br />' + '</p>' + '<p>' + '<i>— Will Saul, CLOSE</i>' + '</p>'
					})]
				}), Div.property({ // Column 4
					className: 'testimonial2-second',
					items: [RichText.property({
						text: '<p style="text-align: center;" class="text-font-size-66 text-line-height-1">' + '<span style="color: #222222;">' + '<i>“</i>' + '</span>' + '<p>' + '<h3>' + '<i>What\'s that? You need a landing page in under an hour? Upstart\'s got your covered.</i>' + '</h3>' + '<p>' + '<br />' + '</p>' + '<p>' + '<i>— Peter Van Hoesen - Life Performance</i>' + '</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Large Quotes',
		screenshot: 'visual/img/blocks/Testimonial2.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],228:[function(require,module,exports){
'use strict';

var T = 'Testimonial3',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-testimonial3'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),

		items1: Div.property({ // Row 1
			className: 'col-xs-12 testimonial3 text-center',
			items: [RichText.property({
				text: '<h2>Hear what others think of Upstart</h2>'
			})]
		}),

		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({ // Clonable Item
				containerClassName: 'grid-xs-1 grid-sm-2 grid-md-3 grid-fixed',
				columns: '3',
				items: [Div.property({ // Column 1
					className: 'display-flex testimonial3-second',
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							size: '80x80xC',
							src: 'assets/img/editor/testimonial/6.png'
						},
						link: ''
					}), RichText.property({
						text: '<p>Donec sed odio dui. Etiam porta sem malesuada magna mollis euismod. Donec id elit non mi porta gravida at eget metus.</p>' + '<p>' + '<br />' + '</p>' + '<p style="text-align: right;">' + '<i>— Jon Hopkins, Immunity</i>' + '</p>'
					})]
				}), Div.property({ // Column 2
					className: 'display-flex testimonial3-second',
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							size: '80x80xC',
							src: 'assets/img/editor/testimonial/7.png'
						},
						link: ''
					}), RichText.property({
						text: '<p>Donec sed odio dui. Etiam porta sem malesuada magna mollis euismod. Donec id elit non mi porta gravida at eget metus.</p>' + '<p>' + '<br />' + '</p>' + '<p style="text-align: right;">' + '<i>— Jon Hopkins, Immunity</i>' + '</p>'
					})]
				}), Div.property({ // Column 3
					className: 'display-flex testimonial3-second',
					items: [FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							size: '80x80xC',
							src: 'assets/img/editor/testimonial/8.png'
						},
						link: ''
					}), RichText.property({
						text: '<p>Donec sed odio dui. Etiam porta sem malesuada magna mollis euismod. Donec id elit non mi porta gravida at eget metus.</p>' + '<p>' + '<br />' + '</p>' + '<p style="text-align: right;">' + '<i>— Jon Hopkins, Immunity</i>' + '</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Thirds Quotes with Avatar',
		screenshot: 'visual/img/blocks/Testimonial3.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],229:[function(require,module,exports){
'use strict';

var T = 'Testimonial4',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe2_1 = require('../../../../../wireframes/visual/wireframes/Wireframe2-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    CloneableByBlock = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe2_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-testimonial4'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-f6f8fa',
			opacity: '100'
		}),

		items1: Div.property({ // Row 1
			className: 'col-xs-12 col-md-9 col-center testimonial4',
			items: [RichText.property({
				text: '<p>' + '<b>KIND WORDS FROM CURRENT UPSTART USERS</b>' + '</p>'
			})]
		}),

		items2: Div.property({ // Row 2
			className: 'col-xs-12',
			items: [CloneableByBlock.property({
				containerClassName: 'grid-xs-1 grid-sm-2 grid-fixed cols-center-xs',
				columns: '2',
				items: [Div.property({ // Item 1
					items: [RichText.property({
						className: 'testimonial4-second',
						text: '<p>“This is the first template I’ve used from Medium Rare and can happily report complete and utter elation. I built our landing page in around an hour and it looks super stylish.”</p>'
					}), FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/testimonial/7.png',
							size: '80x80xC'
						},
						link: ''
					}), RichText.property({
						className: 'testimonial4-third',
						text: '<p>' + '<i>— Jon Hopkins, Immunity</i>' + '</p>'
					})]
				}), Div.property({ // Item 2
					items: [RichText.property({
						className: 'testimonial4-second',
						text: '<p>“I knew from the moment I saw the demos that this was a different kind of beast. Well I was right, Upstart is the single most enjoyable template I’ve used = and believe me,  I’ve used plenty.</p>'
					}), FixedImage.property({
						toolbarProps: {
							inside: false
						},
						image: {
							src: 'assets/img/editor/testimonial/6.png',
							size: '80x80xC'
						},
						link: ''
					}), RichText.property({
						className: 'testimonial4-third',
						text: '<p>' + '<i>— Will Saul, CLOSE</i>' + '</p>'
					})]
				})]
			})]
		})
	},
	visual: {
		title: 'Half Quotes with Avatar',
		screenshot: 'visual/img/blocks/Testimonial4.jpg'
	}
});

VisualDefinition[T] = Wireframe2_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock":295,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe2-1":305}],230:[function(require,module,exports){
'use strict';

var T = 'Testimonial5',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Wireframe1_1 = require('../../../../../wireframes/visual/wireframes/Wireframe1-1'),
    Div = require('../../../../../wireframes/visual/shortcodes/containers/Div'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    FixedImage = require('../../../../../wireframes/visual/shortcodes/FixedImage'),
    RichText = require('../../../../../wireframes/visual/shortcodes/RichText');

ModelDefinition[T] = Wireframe1_1.ModelDefinition.extend({
	properties: {
		sectionClassName: VisualString.property('sec-testimonial5'),
		containerClassName: VisualString.property('padding-vertical-80'),
		sectionBackground: Background.property({
			image: {
				size: '1920x*xR'
			},
			color: 'computed',
			colorClassName: 'bg-ffffff',
			opacity: '90'
		}),
		items1: Div.property({ // Row 1
			className: 'col-xs-12 col-md-10 offset-md-1',
			items: [RichText.property({
				className: 'testimonial5',
				text: '<h2>“Look no further - the future of landing pages has arrived - Viva Upstart!”</h2>'
			}), FixedImage.property({
				toolbarProps: {
					inside: false
				},
				image: {
					src: 'assets/img/editor/testimonial/8.png',
					size: '80x80xC'
				},
				link: ''
			}), RichText.property({
				className: 'testimonial5-second',
				text: '<p>— Jesse Ware, Devotion</p>'
			})]
		})
	},
	visual: {
		title: 'Quotes with Avatar',
		screenshot: 'visual/img/blocks/Testimonial5.jpg'
	}
});

VisualDefinition[T] = Wireframe1_1.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/FixedImage":268,"../../../../../wireframes/visual/shortcodes/RichText":287,"../../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../../wireframes/visual/wireframes/Wireframe1-1":302}],231:[function(require,module,exports){
'use strict';

module.exports = {
	blocks: {
		menu: [
		// require('./blocks/Menu1').type,
		require('./blocks/Menu6').type],
		cover: [require('./blocks/Header9').type, require('./blocks/Header2').type, require('./blocks/Header3').type,
		// require('./blocks/Header13').type,
		require('./blocks/Slider2').type, require('./blocks/Header1').type, require('./blocks/Header4').type, require('./blocks/Header5').type, require('./blocks/Header10').type, require('./blocks/Header12').type,
		// require('./blocks/Header11').type,
		require('./blocks/Header6').type,
		// require('./blocks/Header8').type,
		require('./blocks/Slider1').type, require('./blocks/Header14').type, require('./blocks/Header15').type, require('./blocks/Header7').type, require('./blocks/Header16').type, require('./blocks/Header17').type, require('./blocks/Header19').type,
		// require('./blocks/Header20').type,
		require('./blocks/Header21').type, require('./blocks/Header22').type,
		// require('./blocks/Header23').type,
		// require('./blocks/Header24').type,
		require('./blocks/Header25').type],

		// require('./blocks/Header27').type
		blog: [require('./blocks/Blog1').type],
		features: [require('./blocks/Features8').type, require('./blocks/Features9').type, require('./blocks/Features10').type, require('./blocks/Features11').type, require('./blocks/Features12').type, require('./blocks/Features1').type, require('./blocks/Features2').type, require('./blocks/Features3').type, require('./blocks/Features4').type, require('./blocks/Features5').type, require('./blocks/Features6').type, require('./blocks/Features7').type, require('./blocks/Promobar1').type, require('./blocks/Promobar2').type, require('./blocks/Promobar3').type, require('./blocks/Promobar4').type,
		// require('./blocks/Features13').type,
		// require('./blocks/Features14').type,
		// require('./blocks/Features15').type,
		// require('./blocks/Features16').type,
		// require('./blocks/Features17').type,
		require('./blocks/Features19').type],
		portfolio: [require('./blocks/Portfolio2').type, require('./blocks/Portfolio3').type, require('./blocks/Portfolio4').type, require('./blocks/Portfolio1').type, require('./blocks/Portfolio5').type, require('./blocks/Portfolio6').type],
		testimonial: [require('./blocks/Testimonial2').type, require('./blocks/Testimonial3').type, require('./blocks/Testimonial4').type, require('./blocks/Testimonial5').type, require('./blocks/Testimonial1').type],

		// require('./blocks/Slider3').type,
		team: [require('./blocks/Team1').type, require('./blocks/Team3').type],
		contacts: [require('./blocks/Contacts1').type, require('./blocks/Contacts6').type],
		pricing: [require('./blocks/Pricing2').type, require('./blocks/Pricing5').type, require('./blocks/Pricing1').type, require('./blocks/Pricing4').type, require('./blocks/Pricing3').type],
		footer: [require('./blocks/Footer2').type, require('./blocks/Footer3').type, require('./blocks/Footer4').type, require('./blocks/Footer1').type, require('./blocks/Footer5').type, require('./blocks/Footer6').type]
	},
	icons: [
	// Upstart icons
	"lk-icon-armchair-chair-streamline", "lk-icon-arrow-streamline-target", "lk-icon-backpack-streamline-trekking", "lk-icon-bag-shopping-streamline", "lk-icon-barbecue-eat-food-streamline", "lk-icon-barista-coffee-espresso-streamline", "lk-icon-bomb-bug", "lk-icon-book-dowload-streamline", "lk-icon-book-read-streamline", "lk-icon-browser-streamline-window", "lk-icon-brush-paint-streamline", "lk-icon-bubble-comment-streamline-talk", "lk-icon-bubble-love-streamline-talk", "lk-icon-caddie-shop-shopping-streamline", "lk-icon-caddie-shopping-streamline", "lk-icon-camera-photo-polaroid-streamline", "lk-icon-camera-photo-streamline", "lk-icon-camera-streamline-video", "lk-icon-chaplin-hat-movie-streamline", "lk-icon-chef-food-restaurant-streamline", "lk-icon-clock-streamline-time", "lk-icon-cocktail-mojito-streamline", "lk-icon-coffee-streamline", "lk-icon-computer-imac", "lk-icon-computer-imac-2", "lk-icon-computer-macintosh-vintage", "lk-icon-computer-network-streamline", "lk-icon-computer-streamline", "lk-icon-cook-pan-pot-streamline", "lk-icon-crop-streamline", "lk-icon-crown-king-streamline", "lk-icon-danger-death-delete-destroy-skull-stream", "lk-icon-dashboard-speed-streamline", "lk-icon-database-streamline", "lk-icon-delete-garbage-streamline", "lk-icon-design-graphic-tablet-streamline-tablet", "lk-icon-design-pencil-rule-streamline", "lk-icon-diving-leisure-sea-sport-streamline", "lk-icon-drug-medecine-streamline-syringue", "lk-icon-earth-globe-streamline", "lk-icon-eat-food-fork-knife-streamline", "lk-icon-eat-food-hotdog-streamline", "lk-icon-edit-modify-streamline", "lk-icon-email-mail-streamline", "lk-icon-envellope-mail-streamline", "lk-icon-eye-dropper-streamline", "lk-icon-factory-lift-streamline-warehouse", "lk-icon-first-aid-medecine-shield-streamline", "lk-icon-food-ice-cream-streamline", "lk-icon-frame-picture-streamline", "lk-icon-grid-lines-streamline", "lk-icon-handle-streamline-vector", "lk-icon-happy-smiley-streamline", "lk-icon-headset-sound-streamline", "lk-icon-home-house-streamline", "lk-icon-ibook-laptop", "lk-icon-ink-pen-streamline", "lk-icon-ipad-streamline", "lk-icon-iphone-streamline", "lk-icon-ipod-mini-music-streamline", "lk-icon-ipod-music-streamline", "lk-icon-ipod-streamline", "lk-icon-japan-streamline-tea", "lk-icon-laptop-macbook-streamline", "lk-icon-like-love-streamline", "lk-icon-link-streamline", "lk-icon-lock-locker-streamline", "lk-icon-locker-streamline-unlock", "lk-icon-macintosh", "lk-icon-magic-magic-wand-streamline", "lk-icon-magnet-streamline", "lk-icon-man-people-streamline-user", "lk-icon-map-pin-streamline", "lk-icon-map-streamline-user", "lk-icon-micro-record-streamline", "lk-icon-monocle-mustache-streamline", "lk-icon-music-note-streamline", "lk-icon-music-speaker-streamline", "lk-icon-notebook-streamline", "lk-icon-paint-bucket-streamline", "lk-icon-painting-pallet-streamline", "lk-icon-painting-roll-streamline", "lk-icon-pen-streamline", "lk-icon-pen-streamline-1", "lk-icon-pen-streamline-2", "lk-icon-pen-streamline-3", "lk-icon-photo-pictures-streamline", "lk-icon-picture-streamline", "lk-icon-picture-streamline-1", "lk-icon-receipt-shopping-streamline", "lk-icon-remote-control-streamline", "lk-icon-settings-streamline", "lk-icon-settings-streamline-1", "lk-icon-settings-streamline-2", "lk-icon-shoes-snickers-streamline", "lk-icon-speech-streamline-talk-user", "lk-icon-stamp-streamline", "lk-icon-streamline-suitcase-travel", "lk-icon-streamline-sync", "lk-icon-streamline-umbrella-weather", "lk-icon-bicycle-vintage", "lk-icon-unlock", "lk-icon-target", "lk-icon-tape", "lk-icon-sun", "lk-icon-speaker", "lk-icon-speaker-off", "lk-icon-shoe", "lk-icon-ribbon", "lk-icon-rain", "lk-icon-picture", "lk-icon-pencil", "lk-icon-pencil-ruler", "lk-icon-mouse", "lk-icon-moon", "lk-icon-map", "lk-icon-magnifier", "lk-icon-map-pin", "lk-icon-lock", "lk-icon-list", "lk-icon-list-thumbnails", "lk-icon-line", "lk-icon-laptop", "lk-icon-keyboard", "lk-icon-iphone", "lk-icon-ipad", "lk-icon-imac", "lk-icon-hierarchy", "lk-icon-hierarchy-2", "lk-icon-heart", "lk-icon-graph", "lk-icon-file-text", "lk-icon-file-psd", "lk-icon-file-png", "lk-icon-file-jpg", "lk-icon-envelope", "lk-icon-cloudy", "lk-icon-cloud", "lk-icon-clock", "lk-icon-clipboard", "lk-icon-clap-board", "lk-icon-bubble-3", "lk-icon-bubble-2", "lk-icon-bubble-1", "lk-icon-browser-full", "lk-icon-browser-empty", "lk-icon-bag", "lk-icon-file-ai", "lk-icon-camera", "lk-icon-bicycle", "lk-icon-dribbble", "lk-icon-apple", "lk-icon-app-store", "lk-icon-behance", "lk-icon-google", "lk-icon-linkedin", "lk-icon-facebook", "lk-icon-path", "lk-icon-paypal", "lk-icon-tumblr", "lk-icon-vimeo", "lk-icon-youtube-alt", "lk-icon-mobileme", "lk-icon-blip", "lk-icon-amazon", "lk-icon-spotify", "lk-icon-squarespace", "lk-icon-twitter", "lk-icon-instagram", "icon-type", "icon-box", "icon-archive", "icon-envelope", "icon-email", "icon-files", "icon-printer2", "icon-folder-add", "icon-folder-settings", "icon-folder-check", "icon-wifi-low", "icon-wifi-mid", "icon-wifi-full", "icon-connection-empty", "icon-battery-full", "icon-settings", "icon-arrow-left", "icon-arrow-up", "icon-arrow-down", "icon-arrow-right", "icon-reload", "icon-download", "icon-tag", "icon-trashcan", "icon-search", "icon-zoom-in", "icon-zoom-out", "icon-chat", "icon-clock", "icon-printer", "icon-home", "icon-flag", "icon-meter", "icon-switch", "icon-forbidden", "icon-phone-landscape", "icon-tablet", "icon-tablet-landscape", "icon-laptop", "icon-camera", "icon-microwave-oven", "icon-credit-cards", "icon-map-marker", "icon-map", "icon-support", "icon-newspaper2", "icon-barbell", "icon-stopwatch", "icon-atom", "icon-image", "icon-cube", "icon-bars", "icon-chart", "icon-pencil", "icon-measure", "icon-eyedropper", "icon-file-settings", "icon-file-add", "icon-file", "icon-align-left", "icon-align-right", "icon-align-center", "icon-align-justify", "icon-file-broken", "icon-browser", "icon-windows", "icon-window", "icon-folder", "icon-connection-25", "icon-connection-50", "icon-connection-75", "icon-connection-full", "icon-list", "icon-grid", "icon-stack3", "icon-battery-charging", "icon-battery-empty", "icon-battery-25", "icon-battery-50", "icon-battery-75", "icon-refresh", "icon-volume", "icon-volume-increase", "icon-volume-decrease", "icon-mute", "icon-microphone", "icon-microphone-off", "icon-book", "icon-checkmark", "icon-checkbox-checked", "icon-checkbox", "icon-paperclip", "icon-chat-1", "icon-chat-2", "icon-chat-3", "icon-comment", "icon-calendar", "icon-bookmark", "icon-email2", "icon-heart", "icon-enter", "icon-cloud", "icon-book2", "icon-star", "icon-lock", "icon-unlocked", "icon-unlocked2", "icon-users", "icon-user", "icon-users2", "icon-user2", "icon-bullhorn", "icon-share", "icon-screen", "icon-phone", "icon-phone-portrait", "icon-calculator", "icon-bag", "icon-diamond", "icon-drink", "icon-shorts", "icon-vcard", "icon-sun", "icon-bill", "icon-coffee", "icon-tv2", "icon-newspaper", "icon-stack", "icon-syringe", "icon-health", "icon-bolt", "icon-pill", "icon-bones", "icon-lab", "icon-clipboard", "icon-mug", "icon-bucket", "icon-select", "icon-graph", "icon-crop", "icon-heart2", "icon-cloud2", "icon-star2", "icon-pen", "icon-diamond2", "icon-display", "icon-paperplane", "icon-params", "icon-banknote", "icon-vynil", "icon-truck", "icon-world", "icon-tv", "icon-sound", "icon-video", "icon-trash", "icon-user3", "icon-key", "icon-search2", "icon-settings2", "icon-camera2", "icon-tag2", "icon-lock2", "icon-bulb", "icon-location", "icon-eye", "icon-bubble", "icon-stack2", "icon-cup", "icon-phone2", "icon-news", "icon-mail", "icon-like", "icon-photo", "icon-note", "icon-clock2", "icon-data", "icon-music", "icon-megaphone", "icon-study", "icon-lab2", "icon-food", "icon-t-shirt", "icon-fire", "icon-clip", "icon-shop", "icon-calendar2", "icon-wallet", "icon-duckduckgo", "icon-lkdto", "icon-delicious", "icon-paypal", "icon-flattr", "icon-android", "icon-eventful", "icon-smashmag", "icon-gplus", "icon-wikipedia", "icon-lanyrd", "icon-calendar-1", "icon-stumbleupon", "icon-bitcoin", "icon-w3c", "icon-foursquare", "icon-html5", "icon-ie", "icon-call", "icon-grooveshark", "icon-ninetyninedesigns", "icon-forrst", "icon-digg", "icon-spotify", "icon-reddit", "icon-guest", "icon-blogger", "icon-cc", "icon-dribbble", "icon-evernote", "icon-flickr", "icon-google", "icon-viadeo", "icon-instapaper", "icon-weibo", "icon-klout", "icon-linkedin", "icon-meetup", "icon-vk", "icon-rss", "icon-skype", "icon-twitter", "icon-youtube", "icon-vimeo", "icon-windows2", "icon-aim", "icon-yahoo", "icon-chrome", "icon-email3", "icon-macstore", "icon-myspace", "icon-podcast", "icon-cloudapp", "icon-dropbox", "icon-ebay", "icon-facebook", "icon-github", "icon-github-circled", "icon-googleplay", "icon-itunes", "icon-plurk", "icon-songkick", "icon-lastfm", "icon-gmail", "icon-pinboard", "icon-soundcloud", "icon-tumblr", "icon-eventasaurus", "icon-wordpress", "icon-yelp", "icon-intensedebate", "icon-eventbrite", "icon-scribd", "icon-posterous", "icon-stripe", "icon-opentable", "icon-cart", "icon-print", "icon-dwolla", "icon-appnet", "icon-statusnet", "icon-acrobat", "icon-drupal", "icon-buffer", "icon-pocket", "icon-bitbucket", "icon-lego", "icon-login", "icon-stackoverflow", "icon-hackernews", "icon-xing", "icon-instagram", "icon-angellist", "icon-quora", "icon-openid", "icon-steam", "icon-amazon", "icon-disqus", "icon-plancast", "icon-appstore", "icon-gowalla", "icon-pinterest", "icon-fivehundredpx", "icon-glass", "icon-music2", "icon-search3", "icon-envelope2", "icon-heart3", "icon-star3", "icon-star-empty", "icon-user4", "icon-film", "icon-th-large", "icon-th", "icon-th-list", "icon-ok", "icon-remove", "icon-zoom-in2", "icon-zoom-out2", "icon-off", "icon-signal", "icon-cog", "icon-trash2", "icon-home2", "icon-file2", "icon-time", "icon-road", "icon-download-alt", "icon-download2", "icon-upload", "icon-inbox", "icon-play-circle", "icon-repeat", "icon-refresh2", "icon-list-alt", "icon-lock3", "icon-flag2", "icon-headphones", "icon-volume-off", "icon-volume-down", "icon-volume-up", "icon-qrcode", "icon-barcode", "icon-tag3", "icon-tags", "icon-book3", "icon-bookmark2", "icon-print2", "icon-camera3", "icon-font", "icon-bold", "icon-italic", "icon-text-height", "icon-text-width", "icon-align-left2", "icon-align-center2", "icon-align-right2", "icon-align-justify2", "icon-list2", "icon-indent-left", "icon-indent-right", "icon-facetime-video", "icon-picture", "icon-pencil2", "icon-map-marker2", "icon-adjust", "icon-tint", "icon-edit", "icon-share2", "icon-check", "icon-move", "icon-step-backward", "icon-fast-backward", "icon-backward", "icon-play", "icon-pause", "icon-stop", "icon-forward", "icon-fast-forward", "icon-step-forward", "icon-eject", "icon-chevron-left", "icon-chevron-right", "icon-plus-sign", "icon-minus-sign", "icon-remove-sign", "icon-ok-sign", "icon-question-sign", "icon-info-sign", "icon-screenshot", "icon-remove-circle", "icon-ok-circle", "icon-ban-circle", "icon-arrow-left2", "icon-arrow-right2", "icon-arrow-up2", "icon-arrow-down2", "icon-share-alt", "icon-resize-full", "icon-resize-small", "icon-plus", "icon-minus", "icon-asterisk", "icon-exclamation-sign", "icon-gift", "icon-leaf", "icon-fire2", "icon-eye-open", "icon-eye-close", "icon-warning-sign", "icon-plane", "icon-calendar3", "icon-random", "icon-comment2", "icon-magnet", "icon-chevron-up", "icon-chevron-down", "icon-retweet", "icon-shopping-cart", "icon-folder-close", "icon-folder-open", "icon-resize-vertical", "icon-resize-horizontal", "icon-bar-chart", "icon-twitter-sign", "icon-facebook-sign", "icon-camera-retro", "icon-key2", "icon-cogs", "icon-comments", "icon-thumbs-up", "icon-thumbs-down", "icon-star-half", "icon-heart-empty", "icon-signout", "icon-linkedin-sign", "icon-pushpin", "icon-external-link", "icon-signin", "icon-trophy", "icon-github-sign", "icon-upload-alt", "icon-lemon", "icon-phone3", "icon-check-empty", "icon-bookmark-empty", "icon-phone-sign", "icon-twitter2", "icon-facebook2", "icon-github2", "icon-unlock", "icon-credit", "icon-rss2", "icon-hdd", "icon-bullhorn2", "icon-bell", "icon-certificate", "icon-hand-right", "icon-hand-left", "icon-hand-up", "icon-hand-down", "icon-circle-arrow-left", "icon-circle-arrow-right", "icon-circle-arrow-up", "icon-circle-arrow-down", "icon-globe", "icon-wrench", "icon-tasks", "icon-filter", "icon-briefcase", "icon-fullscreen", "icon-group", "icon-link", "icon-cloud3", "icon-beaker", "icon-cut", "icon-copy", "icon-paper-clip", "icon-save", "icon-sign-blank", "icon-reorder", "icon-list-ul", "icon-list-ol", "icon-strikethrough", "icon-underline", "icon-table", "icon-magic", "icon-truck2", "icon-pinterest2", "icon-pinterest-sign", "icon-google-plus-sign", "icon-google-plus", "icon-money", "icon-caret-down", "icon-caret-up", "icon-caret-left", "icon-caret-right", "icon-columns", "icon-sort", "icon-sort-down", "icon-sort-up", "icon-envelope-alt", "icon-linkedin2", "icon-undo", "icon-legal", "icon-dashboard", "icon-comment-alt", "icon-comments-alt", "icon-bolt2", "icon-sitemap", "icon-umbrella", "icon-paste", "icon-lightbulb", "icon-exchange", "icon-cloud-download", "icon-cloud-upload", "icon-user-md", "icon-stethoscope", "icon-suitcase", "icon-bell-alt", "icon-coffee2", "icon-food2", "icon-file-alt", "icon-building", "icon-hospital", "icon-ambulance", "icon-medkit", "icon-fighter-jet", "icon-beer", "icon-h-sign", "icon-plus-sign2", "icon-double-angle-left", "icon-double-angle-right", "icon-double-angle-up", "icon-double-angle-down", "icon-angle-left", "icon-angle-right", "icon-angle-up", "icon-angle-down", "icon-desktop", "icon-laptop2", "icon-tablet2", "icon-mobile", "icon-circle-blank", "icon-quote-left", "icon-quote-right", "icon-spinner", "icon-circle", "icon-reply", "icon-github-alt", "icon-folder-close-alt", "icon-folder-open-alt", "icon-expand-alt", "icon-collapse-alt", "icon-smile", "icon-frown", "icon-meh", "icon-gamepad", "icon-keyboard", "icon-flag-alt", "icon-flag-checkered", "icon-terminal", "icon-code", "icon-reply-all", "icon-star-half-full", "icon-location-arrow", "icon-crop2", "icon-code-fork", "icon-unlink", "icon-question", "icon-info", "icon-exclamation", "icon-superscript", "icon-subscript", "icon-eraser", "icon-puzzle", "icon-microphone2", "icon-microphone-off2", "icon-shield", "icon-calendar-empty", "icon-fire-extinguisher", "icon-rocket", "icon-maxcdn", "icon-chevron-sign-left", "icon-chevron-sign-right", "icon-chevron-sign-up", "icon-chevron-sign-down", "icon-html52", "icon-css3", "icon-anchor", "icon-unlock-alt", "icon-bullseye", "icon-ellipsis-horizontal", "icon-ellipsis-vertical", "icon-rss-sign", "icon-play-sign", "icon-ticket", "icon-minus-sign-alt", "icon-check-minus", "icon-level-up", "icon-level-down", "icon-check-sign", "icon-edit-sign", "icon-external-link-sign", "icon-share-sign", "icon-compass", "icon-collapse", "icon-collapse-top", "icon-expand", "icon-euro", "icon-gbp", "icon-dollar", "icon-rupee", "icon-yen", "icon-renminbi", "icon-won", "icon-bitcoin2", "icon-file3", "icon-file-text", "icon-sort-by-alphabet", "icon-sort-by-alphabet-alt", "icon-sort-by-attributes", "icon-sort-by-attributes-alt", "icon-sort-by-order", "icon-sort-by-order-alt", "icon-thumbs-up2", "icon-thumbs-down2", "icon-youtube-sign", "icon-youtube2", "icon-xing2", "icon-xing-sign", "icon-youtube-play", "icon-dropbox2", "icon-stackexchange", "icon-instagram2", "icon-flickr2", "icon-adn", "icon-bitbucket2", "icon-bitbucket-sign", "icon-tumblr2", "icon-tumblr-sign", "icon-long-arrow-down", "icon-long-arrow-up", "icon-long-arrow-left", "icon-long-arrow-right", "icon-apple", "icon-windows3", "icon-android2", "icon-linux", "icon-dribbble2", "icon-skype2", "icon-foursquare2", "icon-trello", "icon-female", "icon-male", "icon-gittip", "icon-sun2", "icon-moon", "icon-archive2", "icon-bug", "icon-renren", "icon-weibo2", "icon-vk2", "icon-line-eye", "icon-line-paper-clip", "icon-line-mail", "icon-line-toggle", "icon-line-layout", "icon-line-link", "icon-line-bell", "icon-line-lock", "icon-line-unlock", "icon-line-ribbon", "icon-line-image", "icon-line-signal", "icon-line-target", "icon-line-clipboard", "icon-line-clock", "icon-line-watch", "icon-line-air-play", "icon-line-camera", "icon-line-video", "icon-line-disc", "icon-line-printer", "icon-line-monitor", "icon-line-server", "icon-line-cog", "icon-line-heart", "icon-line-paragraph", "icon-line-align-justify", "icon-line-align-left", "icon-line-align-center", "icon-line-align-right", "icon-line-book", "icon-line-layers", "icon-line-stack", "icon-line-stack-2", "icon-line-paper", "icon-line-paper-stack", "icon-line-search", "icon-line-zoom-in", "icon-line-zoom-out", "icon-line-reply", "icon-line-circle-plus", "icon-line-circle-minus", "icon-line-circle-check", "icon-line-circle-cross", "icon-line-square-plus", "icon-line-square-minus", "icon-line-square-check", "icon-line-square-cross", "icon-line-microphone", "icon-line-record", "icon-line-skip-back", "icon-line-rewind", "icon-line-play", "icon-line-pause", "icon-line-stop", "icon-line-fast-forward", "icon-line-skip-forward", "icon-line-shuffle", "icon-line-repeat", "icon-line-folder", "icon-line-umbrella", "icon-line-moon", "icon-line-thermometer", "icon-line-drop", "icon-line-sun", "icon-line-cloud", "icon-line-cloud-upload", "icon-line-cloud-download", "icon-line-upload", "icon-line-download", "icon-line-location", "icon-line-location-2", "icon-line-map", "icon-line-battery", "icon-line-head", "icon-line-briefcase", "icon-line-speech-bubble", "icon-line-anchor", "icon-line-globe", "icon-line-box", "icon-line-reload", "icon-line-share", "icon-line-marquee", "icon-line-marquee-plus", "icon-line-marquee-minus", "icon-line-tag", "icon-line-power", "icon-line-command", "icon-line-alt", "icon-line-esc", "icon-line-bar-graph", "icon-line-bar-graph-2", "icon-line-pie-graph", "icon-line-star", "icon-line-arrow-left", "icon-line-arrow-right", "icon-line-arrow-up", "icon-line-arrow-down", "icon-line-volume", "icon-line-mute", "icon-line-content-right", "icon-line-content-left", "icon-line-grid", "icon-line-grid-2", "icon-line-columns", "icon-line-loader", "icon-line-bag", "icon-line-ban", "icon-line-flag", "icon-line-trash", "icon-line-expand", "icon-line-contract", "icon-line-maximize", "icon-line-minimize", "icon-line-plus", "icon-line-minus", "icon-line-check", "icon-line-cross", "icon-line-move", "icon-line-delete", "icon-line-menu", "icon-line-archive", "icon-line-inbox", "icon-line-outbox", "icon-line-file", "icon-line-file-add", "icon-line-file-subtract", "icon-line-help", "icon-line-open", "icon-line-ellipsis", "icon-line2-user-female", "icon-line2-user-follow", "icon-line2-user-following", "icon-line2-user-unfollow", "icon-line2-trophy", "icon-line2-screen-smartphone", "icon-line2-screen-desktop", "icon-line2-plane", "icon-line2-notebook", "icon-line2-moustache", "icon-line2-mouse", "icon-line2-magnet", "icon-line2-energy", "icon-line2-disc", "icon-line2-cursor-move", "icon-line2-crop", "icon-line2-credit-card", "icon-line2-chemistry", "icon-line2-user", "icon-line2-speedometer", "icon-line2-social-youtube", "icon-line2-social-twitter", "icon-line2-social-tumblr", "icon-line2-social-facebook", "icon-line2-social-dropbox", "icon-line2-social-dribbble", "icon-line2-shield", "icon-line2-screen-tablet", "icon-line2-magic-wand", "icon-line2-hourglass", "icon-line2-graduation", "icon-line2-ghost", "icon-line2-game-controller", "icon-line2-fire", "icon-line2-eyeglasses", "icon-line2-envelope-open", "icon-line2-envelope-letter", "icon-line2-bell", "icon-line2-badge", "icon-line2-anchor", "icon-line2-wallet", "icon-line2-vector", "icon-line2-speech", "icon-line2-puzzle", "icon-line2-printer", "icon-line2-present", "icon-line2-playlist", "icon-line2-pin", "icon-line2-picture", "icon-line2-map", "icon-line2-layers", "icon-line2-handbag", "icon-line2-globe-alt", "icon-line2-globe", "icon-line2-frame", "icon-line2-folder-alt", "icon-line2-film", "icon-line2-feed", "icon-line2-earphones-alt", "icon-line2-earphones", "icon-line2-drop", "icon-line2-drawer", "icon-line2-docs", "icon-line2-directions", "icon-line2-direction", "icon-line2-diamond", "icon-line2-cup", "icon-line2-compass", "icon-line2-call-out", "icon-line2-call-in", "icon-line2-call-end", "icon-line2-calculator", "icon-line2-bubbles", "icon-line2-briefcase", "icon-line2-book-open", "icon-line2-basket-loaded", "icon-line2-basket", "icon-line2-bag", "icon-line2-action-undo", "icon-line2-action-redo", "icon-line2-wrench", "icon-line2-umbrella", "icon-line2-trash", "icon-line2-tag", "icon-line2-support", "icon-line2-size-fullscreen", "icon-line2-size-actual", "icon-line2-shuffle", "icon-line2-share-alt", "icon-line2-share", "icon-line2-rocket", "icon-line2-question", "icon-line2-pie-chart", "icon-line2-pencil", "icon-line2-note", "icon-line2-music-tone-alt", "icon-line2-music-tone", "icon-line2-microphone", "icon-line2-loop", "icon-line2-logout", "icon-line2-login", "icon-line2-list", "icon-line2-like", "icon-line2-home", "icon-line2-grid", "icon-line2-graph", "icon-line2-equalizer", "icon-line2-dislike", "icon-line2-cursor", "icon-line2-control-start", "icon-line2-control-rewind", "icon-line2-control-play", "icon-line2-control-pause", "icon-line2-control-forward", "icon-line2-control-end", "icon-line2-calendar", "icon-line2-bulb", "icon-line2-bar-chart", "icon-line2-arrow-up", "icon-line2-arrow-right", "icon-line2-arrow-left", "icon-line2-arrow-down", "icon-line2-ban", "icon-line2-bubble", "icon-line2-camcorder", "icon-line2-camera", "icon-line2-check", "icon-line2-clock", "icon-line2-close", "icon-line2-cloud-download", "icon-line2-cloud-upload", "icon-line2-doc", "icon-line2-envelope", "icon-line2-eye", "icon-line2-flag", "icon-line2-folder", "icon-line2-heart", "icon-line2-info", "icon-line2-key", "icon-line2-link", "icon-line2-lock", "icon-line2-lock-open", "icon-line2-magnifier", "icon-line2-magnifier-add", "icon-line2-magnifier-remove", "icon-line2-paper-clip", "icon-line2-paper-plane", "icon-line2-plus", "icon-line2-pointer", "icon-line2-power", "icon-line2-refresh", "icon-line2-reload", "icon-line2-settings", "icon-line2-star", "icon-line2-symbol-female", "icon-line2-symbol-male", "icon-line2-target", "icon-line2-volume-1", "icon-line2-volume-2", "icon-line2-volume-off", "icon-line2-users",

	// font awesome 4.5.0
	"fa fa-500px", "fa fa-adjust", "fa fa-adn", "fa fa-align-center", "fa fa-align-justify", "fa fa-align-left", "fa fa-align-right", "fa fa-amazon", "fa fa-ambulance", "fa fa-anchor", "fa fa-android", "fa fa-angellist", "fa fa-angle-double-down", "fa fa-angle-double-left", "fa fa-angle-double-right", "fa fa-angle-double-up", "fa fa-angle-down", "fa fa-angle-left", "fa fa-angle-right", "fa fa-angle-up", "fa fa-apple", "fa fa-archive", "fa fa-area-chart", "fa fa-arrow-circle-down", "fa fa-arrow-circle-left", "fa fa-arrow-circle-o-down", "fa fa-arrow-circle-o-left", "fa fa-arrow-circle-o-right", "fa fa-arrow-circle-o-up", "fa fa-arrow-circle-right", "fa fa-arrow-circle-up", "fa fa-arrow-down", "fa fa-arrow-left", "fa fa-arrow-right", "fa fa-arrow-up", "fa fa-arrows", "fa fa-arrows-alt", "fa fa-arrows-h", "fa fa-arrows-v", "fa fa-asterisk", "fa fa-at", "fa fa-automobile", "fa fa-backward", "fa fa-balance-scale", "fa fa-ban", "fa fa-bank", "fa fa-bar-chart", "fa fa-bar-chart-o", "fa fa-barcode", "fa fa-bars", "fa fa-battery-0", "fa fa-battery-1", "fa fa-battery-2", "fa fa-battery-3", "fa fa-battery-4", "fa fa-battery-empty", "fa fa-battery-full", "fa fa-battery-half", "fa fa-battery-quarter", "fa fa-battery-three-quarters", "fa fa-bed", "fa fa-beer", "fa fa-behance", "fa fa-behance-square", "fa fa-bell", "fa fa-bell-o", "fa fa-bell-slash", "fa fa-bell-slash-o", "fa fa-bicycle", "fa fa-binoculars", "fa fa-birthday-cake", "fa fa-bitbucket", "fa fa-bitbucket-square", "fa fa-bitcoin", "fa fa-black-tie", "fa fa-bluetooth", "fa fa-bluetooth-b", "fa fa-bold", "fa fa-bolt", "fa fa-bomb", "fa fa-book", "fa fa-bookmark", "fa fa-bookmark-o", "fa fa-briefcase", "fa fa-btc", "fa fa-bug", "fa fa-building", "fa fa-building-o", "fa fa-bullhorn", "fa fa-bullseye", "fa fa-bus", "fa fa-buysellads", "fa fa-cab", "fa fa-calculator", "fa fa-calendar", "fa fa-calendar-check-o", "fa fa-calendar-minus-o", "fa fa-calendar-o", "fa fa-calendar-plus-o", "fa fa-calendar-times-o", "fa fa-camera", "fa fa-camera-retro", "fa fa-car", "fa fa-caret-down", "fa fa-caret-left", "fa fa-caret-right", "fa fa-caret-square-o-down", "fa fa-caret-square-o-left", "fa fa-caret-square-o-right", "fa fa-caret-square-o-up", "fa fa-caret-up", "fa fa-cart-arrow-down", "fa fa-cart-plus", "fa fa-cc", "fa fa-cc-amex", "fa fa-cc-diners-club", "fa fa-cc-discover", "fa fa-cc-jcb", "fa fa-cc-mastercard", "fa fa-cc-paypal", "fa fa-cc-stripe", "fa fa-cc-visa", "fa fa-certificate", "fa fa-chain", "fa fa-chain-broken", "fa fa-check", "fa fa-check-circle", "fa fa-check-circle-o", "fa fa-check-square", "fa fa-check-square-o", "fa fa-chevron-circle-down", "fa fa-chevron-circle-left", "fa fa-chevron-circle-right", "fa fa-chevron-circle-up", "fa fa-chevron-down", "fa fa-chevron-left", "fa fa-chevron-right", "fa fa-chevron-up", "fa fa-child", "fa fa-chrome", "fa fa-circle", "fa fa-circle-o", "fa fa-circle-o-notch", "fa fa-circle-thin", "fa fa-clipboard", "fa fa-clock-o", "fa fa-clone", "fa fa-close", "fa fa-cloud", "fa fa-cloud-download", "fa fa-cloud-upload", "fa fa-cny", "fa fa-code", "fa fa-code-fork", "fa fa-codepen", "fa fa-codiepie", "fa fa-coffee", "fa fa-cog", "fa fa-cogs", "fa fa-columns", "fa fa-comment", "fa fa-comment-o", "fa fa-commenting", "fa fa-commenting-o", "fa fa-comments", "fa fa-comments-o", "fa fa-compass", "fa fa-compress", "fa fa-connectdevelop", "fa fa-contao", "fa fa-copy", "fa fa-copyright", "fa fa-creative-commons", "fa fa-credit-card", "fa fa-credit-card-alt", "fa fa-crop", "fa fa-crosshairs", "fa fa-css3", "fa fa-cube", "fa fa-cubes", "fa fa-cut", "fa fa-cutlery", "fa fa-dashboard", "fa fa-dashcube", "fa fa-database", "fa fa-dedent", "fa fa-delicious", "fa fa-desktop", "fa fa-deviantart", "fa fa-diamond", "fa fa-digg", "fa fa-dollar", "fa fa-dot-circle-o", "fa fa-download", "fa fa-dribbble", "fa fa-dropbox", "fa fa-drupal", "fa fa-edge", "fa fa-edit", "fa fa-eject", "fa fa-ellipsis-h", "fa fa-ellipsis-v", "fa fa-empire", "fa fa-envelope", "fa fa-envelope-o", "fa fa-envelope-square", "fa fa-eraser", "fa fa-eur", "fa fa-euro", "fa fa-exchange", "fa fa-exclamation", "fa fa-exclamation-circle", "fa fa-exclamation-triangle", "fa fa-expand", "fa fa-expeditedssl", "fa fa-external-link", "fa fa-external-link-square", "fa fa-eye", "fa fa-eye-slash", "fa fa-eyedropper", "fa fa-facebook", "fa fa-facebook-f", "fa fa-facebook-official", "fa fa-facebook-square", "fa fa-fast-backward", "fa fa-fast-forward", "fa fa-fax", "fa fa-feed", "fa fa-female", "fa fa-fighter-jet", "fa fa-file", "fa fa-file-archive-o", "fa fa-file-audio-o", "fa fa-file-code-o", "fa fa-file-excel-o", "fa fa-file-image-o", "fa fa-file-movie-o", "fa fa-file-o", "fa fa-file-pdf-o", "fa fa-file-photo-o", "fa fa-file-picture-o", "fa fa-file-powerpoint-o", "fa fa-file-sound-o", "fa fa-file-text", "fa fa-file-text-o", "fa fa-file-video-o", "fa fa-file-word-o", "fa fa-file-zip-o", "fa fa-files-o", "fa fa-film", "fa fa-filter", "fa fa-fire", "fa fa-fire-extinguisher", "fa fa-firefox", "fa fa-flag", "fa fa-flag-checkered", "fa fa-flag-o", "fa fa-flash", "fa fa-flask", "fa fa-flickr", "fa fa-floppy-o", "fa fa-folder", "fa fa-folder-o", "fa fa-folder-open", "fa fa-folder-open-o", "fa fa-font", "fa fa-fonticons", "fa fa-fort-awesome", "fa fa-forumbee", "fa fa-forward", "fa fa-foursquare", "fa fa-frown-o", "fa fa-futbol-o", "fa fa-gamepad", "fa fa-gavel", "fa fa-gbp", "fa fa-ge", "fa fa-gear", "fa fa-gears", "fa fa-genderless", "fa fa-get-pocket", "fa fa-gg", "fa fa-gg-circle", "fa fa-gift", "fa fa-git", "fa fa-git-square", "fa fa-github", "fa fa-github-alt", "fa fa-github-square", "fa fa-gittip", "fa fa-glass", "fa fa-globe", "fa fa-google", "fa fa-google-plus", "fa fa-google-plus-square", "fa fa-google-wallet", "fa fa-graduation-cap", "fa fa-gratipay", "fa fa-group", "fa fa-h-square", "fa fa-hacker-news", "fa fa-hand-grab-o", "fa fa-hand-lizard-o", "fa fa-hand-o-down", "fa fa-hand-o-left", "fa fa-hand-o-right", "fa fa-hand-o-up", "fa fa-hand-paper-o", "fa fa-hand-peace-o", "fa fa-hand-pointer-o", "fa fa-hand-rock-o", "fa fa-hand-scissors-o", "fa fa-hand-spock-o", "fa fa-hand-stop-o", "fa fa-hashtag", "fa fa-hdd-o", "fa fa-header", "fa fa-headphones", "fa fa-heart", "fa fa-heart-o", "fa fa-heartbeat", "fa fa-history", "fa fa-home", "fa fa-hospital-o", "fa fa-hotel", "fa fa-hourglass", "fa fa-hourglass-1", "fa fa-hourglass-2", "fa fa-hourglass-3", "fa fa-hourglass-end", "fa fa-hourglass-half", "fa fa-hourglass-o", "fa fa-hourglass-start", "fa fa-houzz", "fa fa-html5", "fa fa-i-cursor", "fa fa-ils", "fa fa-image", "fa fa-inbox", "fa fa-indent", "fa fa-industry", "fa fa-info", "fa fa-info-circle", "fa fa-inr", "fa fa-instagram", "fa fa-institution", "fa fa-internet-explorer", "fa fa-intersex", "fa fa-ioxhost", "fa fa-italic", "fa fa-joomla", "fa fa-jpy", "fa fa-jsfiddle", "fa fa-key", "fa fa-keyboard-o", "fa fa-krw", "fa fa-language", "fa fa-laptop", "fa fa-lastfm", "fa fa-lastfm-square", "fa fa-leaf", "fa fa-leanpub", "fa fa-legal", "fa fa-lemon-o", "fa fa-level-down", "fa fa-level-up", "fa fa-life-bouy", "fa fa-life-buoy", "fa fa-life-ring", "fa fa-life-saver", "fa fa-lightbulb-o", "fa fa-line-chart", "fa fa-link", "fa fa-linkedin", "fa fa-linkedin-square", "fa fa-linux", "fa fa-list", "fa fa-list-alt", "fa fa-list-ol", "fa fa-list-ul", "fa fa-location-arrow", "fa fa-lock", "fa fa-long-arrow-down", "fa fa-long-arrow-left", "fa fa-long-arrow-right", "fa fa-long-arrow-up", "fa fa-magic", "fa fa-magnet", "fa fa-mail-forward", "fa fa-mail-reply", "fa fa-mail-reply-all", "fa fa-male", "fa fa-map", "fa fa-map-marker", "fa fa-map-o", "fa fa-map-pin", "fa fa-map-signs", "fa fa-mars", "fa fa-mars-double", "fa fa-mars-stroke", "fa fa-mars-stroke-h", "fa fa-mars-stroke-v", "fa fa-maxcdn", "fa fa-meanpath", "fa fa-medium", "fa fa-medkit", "fa fa-meh-o", "fa fa-mercury", "fa fa-microphone", "fa fa-microphone-slash", "fa fa-minus", "fa fa-minus-circle", "fa fa-minus-square", "fa fa-minus-square-o", "fa fa-mixcloud", "fa fa-mobile", "fa fa-mobile-phone", "fa fa-modx", "fa fa-money", "fa fa-moon-o", "fa fa-mortar-board", "fa fa-motorcycle", "fa fa-mouse-pointer", "fa fa-music", "fa fa-navicon", "fa fa-neuter", "fa fa-newspaper-o", "fa fa-object-group", "fa fa-object-ungroup", "fa fa-odnoklassniki", "fa fa-odnoklassniki-square", "fa fa-opencart", "fa fa-openid", "fa fa-opera", "fa fa-optin-monster", "fa fa-outdent", "fa fa-pagelines", "fa fa-paint-brush", "fa fa-paper-plane", "fa fa-paper-plane-o", "fa fa-paperclip", "fa fa-paragraph", "fa fa-paste", "fa fa-pause", "fa fa-pause-circle", "fa fa-pause-circle-o", "fa fa-paw", "fa fa-paypal", "fa fa-pencil", "fa fa-pencil-square", "fa fa-pencil-square-o", "fa fa-percent", "fa fa-phone", "fa fa-phone-square", "fa fa-photo", "fa fa-picture-o", "fa fa-pie-chart", "fa fa-pied-piper", "fa fa-pied-piper-alt", "fa fa-pinterest", "fa fa-pinterest-p", "fa fa-pinterest-square", "fa fa-plane", "fa fa-play", "fa fa-play-circle", "fa fa-play-circle-o", "fa fa-plug", "fa fa-plus", "fa fa-plus-circle", "fa fa-plus-square", "fa fa-plus-square-o", "fa fa-power-off", "fa fa-print", "fa fa-product-hunt", "fa fa-puzzle-piece", "fa fa-qq", "fa fa-qrcode", "fa fa-question", "fa fa-question-circle", "fa fa-quote-left", "fa fa-quote-right", "fa fa-ra", "fa fa-random", "fa fa-rebel", "fa fa-recycle", "fa fa-reddit", "fa fa-reddit-alien", "fa fa-reddit-square", "fa fa-refresh", "fa fa-registered", "fa fa-remove", "fa fa-renren", "fa fa-reorder", "fa fa-repeat", "fa fa-reply", "fa fa-reply-all", "fa fa-retweet", "fa fa-rmb", "fa fa-road", "fa fa-rocket", "fa fa-rotate-left", "fa fa-rotate-right", "fa fa-rouble", "fa fa-rss", "fa fa-rss-square", "fa fa-rub", "fa fa-ruble", "fa fa-rupee", "fa fa-safari", "fa fa-save", "fa fa-scissors", "fa fa-scribd", "fa fa-search", "fa fa-search-minus", "fa fa-search-plus", "fa fa-sellsy", "fa fa-send", "fa fa-send-o", "fa fa-server", "fa fa-share", "fa fa-share-alt", "fa fa-share-alt-square", "fa fa-share-square", "fa fa-share-square-o", "fa fa-shekel", "fa fa-sheqel", "fa fa-shield", "fa fa-ship", "fa fa-shirtsinbulk", "fa fa-shopping-bag", "fa fa-shopping-basket", "fa fa-shopping-cart", "fa fa-sign-in", "fa fa-sign-out", "fa fa-signal", "fa fa-simplybuilt", "fa fa-sitemap", "fa fa-skyatlas", "fa fa-skype", "fa fa-slack", "fa fa-sliders", "fa fa-slideshare", "fa fa-smile-o", "fa fa-soccer-ball-o", "fa fa-sort", "fa fa-sort-alpha-asc", "fa fa-sort-alpha-desc", "fa fa-sort-amount-asc", "fa fa-sort-amount-desc", "fa fa-sort-asc", "fa fa-sort-desc", "fa fa-sort-down", "fa fa-sort-numeric-asc", "fa fa-sort-numeric-desc", "fa fa-sort-up", "fa fa-soundcloud", "fa fa-space-shuttle", "fa fa-spinner", "fa fa-spoon", "fa fa-spotify", "fa fa-square", "fa fa-square-o", "fa fa-stack-exchange", "fa fa-stack-overflow", "fa fa-star", "fa fa-star-half", "fa fa-star-half-empty", "fa fa-star-half-full", "fa fa-star-half-o", "fa fa-star-o", "fa fa-steam", "fa fa-steam-square", "fa fa-step-backward", "fa fa-step-forward", "fa fa-stethoscope", "fa fa-sticky-note", "fa fa-sticky-note-o", "fa fa-stop", "fa fa-stop-circle", "fa fa-stop-circle-o", "fa fa-street-view", "fa fa-strikethrough", "fa fa-stumbleupon", "fa fa-stumbleupon-circle", "fa fa-subscript", "fa fa-subway", "fa fa-suitcase", "fa fa-sun-o", "fa fa-superscript", "fa fa-support", "fa fa-table", "fa fa-tablet", "fa fa-tachometer", "fa fa-tag", "fa fa-tags", "fa fa-tasks", "fa fa-taxi", "fa fa-television", "fa fa-tencent-weibo", "fa fa-terminal", "fa fa-text-height", "fa fa-text-width", "fa fa-th", "fa fa-th-large", "fa fa-th-list", "fa fa-thumb-tack", "fa fa-thumbs-down", "fa fa-thumbs-o-down", "fa fa-thumbs-o-up", "fa fa-thumbs-up", "fa fa-ticket", "fa fa-times", "fa fa-times-circle", "fa fa-times-circle-o", "fa fa-tint", "fa fa-toggle-down", "fa fa-toggle-left", "fa fa-toggle-off", "fa fa-toggle-on", "fa fa-toggle-right", "fa fa-toggle-up", "fa fa-trademark", "fa fa-train", "fa fa-transgender", "fa fa-transgender-alt", "fa fa-trash", "fa fa-trash-o", "fa fa-tree", "fa fa-trello", "fa fa-tripadvisor", "fa fa-trophy", "fa fa-truck", "fa fa-try", "fa fa-tty", "fa fa-tumblr", "fa fa-tumblr-square", "fa fa-turkish-lira", "fa fa-tv", "fa fa-twitch", "fa fa-twitter", "fa fa-twitter-square", "fa fa-umbrella", "fa fa-underline", "fa fa-undo", "fa fa-university", "fa fa-unlink", "fa fa-unlock", "fa fa-unlock-alt", "fa fa-unsorted", "fa fa-upload", "fa fa-usb", "fa fa-usd", "fa fa-user", "fa fa-user-md", "fa fa-user-plus", "fa fa-user-secret", "fa fa-user-times", "fa fa-users", "fa fa-venus", "fa fa-venus-double", "fa fa-venus-mars", "fa fa-viacoin", "fa fa-video-camera", "fa fa-vimeo", "fa fa-vimeo-square", "fa fa-vine", "fa fa-vk", "fa fa-volume-down", "fa fa-volume-off", "fa fa-volume-up", "fa fa-warning", "fa fa-wechat", "fa fa-weibo", "fa fa-weixin", "fa fa-whatsapp", "fa fa-wheelchair", "fa fa-wifi", "fa fa-wikipedia-w", "fa fa-windows", "fa fa-won", "fa fa-wordpress", "fa fa-wrench", "fa fa-xing", "fa fa-xing-square", "fa fa-y-combinator", "fa fa-y-combinator-square", "fa fa-yahoo", "fa fa-yc", "fa fa-yc-square", "fa fa-yelp", "fa fa-yen", "fa fa-youtube", "fa fa-youtube-play", "fa fa-youtube-square"],
	menus: [{
		id: 'header-menu',
		title: 'HEADER MENU'
	}, {
		id: 'footer-menu',
		title: 'FOOTER MENU',
		multiLevel: false
	}],
	fonts: {
		headings: 'lato',
		paragraphs: 'lato'
	},
	colorSchemes: [{
		id: 'themse1',
		title: 'Original',
		previewColor: '#6dc77a',
		href: 'assets/css/skins/skins-default.css'
	}, {
		id: 'theme2',
		title: 'Emerald',
		previewColor: '#33c68a',
		href: 'assets/css/skins/skins-Emerald.css'
	}, {
		id: 'theme3',
		title: 'Olive',
		previewColor: '#b6cf6c',
		href: 'assets/css/skins/skins-Olive.css'
	}, {
		id: 'theme4',
		title: 'Blue',
		previewColor: '#0785f2',
		href: 'assets/css/skins/skins-Blue.css'
	}, {
		id: 'theme5',
		title: 'Fairsky',
		previewColor: '#38acd2',
		href: 'assets/css/skins/skins-Fairsky.css'
	}, {
		id: 'theme6',
		title: 'DeepBlue',
		previewColor: '#051da6',
		href: 'assets/css/skins/skins-DeepBlue.css'
	}, {
		id: 'theme7',
		title: 'Business',
		previewColor: '#233c59',
		href: 'assets/css/skins/skins-Business.css'
	}, {
		id: 'theme8',
		title: 'Velvet',
		previewColor: '#e24548',
		href: 'assets/css/skins/skins-Velvet.css'
	}, {
		id: 'theme9',
		title: 'Rose',
		previewColor: '#c956ae',
		href: 'assets/css/skins/skins-Rose.css'
	}, {
		id: 'theme10',
		title: 'Gumboot',
		previewColor: '#f27244',
		href: 'assets/css/skins/skins-Gumboot.css'
	}, {
		id: 'theme11',
		title: 'Chipotle',
		previewColor: '#f2a057',
		href: 'assets/css/skins/skins-Chipotle.css'
	}, {
		id: 'theme12',
		title: 'Tote',
		previewColor: '#a68b7c',
		href: 'assets/css/skins/skins-Tote.css'
	}, {
		id: 'theme13',
		title: 'Cacao',
		previewColor: '#735c48',
		href: 'assets/css/skins/skins-Cacao.css'
	}],
	fontSchemes: [{
		"id": "theme1",
		"title": "Montserrat",
		"href": "assets/css/skins/font/montserrat.css"
	}, {
		"id": "theme2",
		"title": "Lato",
		"href": "assets/css/skins/font/lato.css"
	}, {
		"id": "theme3",
		"title": "Raleway",
		"href": "assets/css/skins/font/raleway.css"
	}]
};

},{"./blocks/Blog1":166,"./blocks/Contacts1":167,"./blocks/Contacts6":168,"./blocks/Features1":169,"./blocks/Features10":170,"./blocks/Features11":171,"./blocks/Features12":172,"./blocks/Features19":173,"./blocks/Features2":174,"./blocks/Features3":175,"./blocks/Features4":176,"./blocks/Features5":177,"./blocks/Features6":178,"./blocks/Features7":179,"./blocks/Features8":180,"./blocks/Features9":181,"./blocks/Footer1":182,"./blocks/Footer2":183,"./blocks/Footer3":184,"./blocks/Footer4":185,"./blocks/Footer5":186,"./blocks/Footer6":187,"./blocks/Header1":188,"./blocks/Header10":189,"./blocks/Header12":190,"./blocks/Header14":191,"./blocks/Header15":192,"./blocks/Header16":193,"./blocks/Header17":194,"./blocks/Header19":195,"./blocks/Header2":196,"./blocks/Header21":197,"./blocks/Header22":198,"./blocks/Header25":199,"./blocks/Header3":200,"./blocks/Header4":201,"./blocks/Header5":202,"./blocks/Header6":203,"./blocks/Header7":204,"./blocks/Header9":205,"./blocks/Menu6":206,"./blocks/Portfolio1":207,"./blocks/Portfolio2":208,"./blocks/Portfolio3":209,"./blocks/Portfolio4":210,"./blocks/Portfolio5":211,"./blocks/Portfolio6":212,"./blocks/Pricing1":213,"./blocks/Pricing2":214,"./blocks/Pricing3":215,"./blocks/Pricing4":216,"./blocks/Pricing5":217,"./blocks/Promobar1":218,"./blocks/Promobar2":219,"./blocks/Promobar3":220,"./blocks/Promobar4":221,"./blocks/Slider1":222,"./blocks/Slider2":223,"./blocks/Team1":224,"./blocks/Team3":225,"./blocks/Testimonial1":226,"./blocks/Testimonial2":227,"./blocks/Testimonial3":228,"./blocks/Testimonial4":229,"./blocks/Testimonial5":230}],232:[function(require,module,exports){
'use strict';

module.exports = {
    COLOR_SCHEMES_GLOBALS_KEY: 'colorScheme',
    COLOR_SCHEMES_CONFIG_KEY: 'colorSchemes'
};

},{}],233:[function(require,module,exports){
'use strict';

var _ = (window._);
var jQuery = (window.jQuery);
var React = (window.React);
var Visual = require('../../../../editor/js/Visual');

var Model = require('../../../../editor/js/Model');
var VisualPage = require('../../../../editor/js/model/visual/VisualPage');

var Config = require('../../../../editor/js/global/Config');
var Pages = require('../../../../editor/js/global/Pages');
var Router = require('../../../../editor/js/global/Router');
var UIState = require('../../../../editor/js/global/UIState');
var Notifications = require('../../../../editor/js/global/Notifications');

var PageSavingFeedback = require('./PageSavingFeedback');

var Editor = React.createClass({
    displayName: 'Editor',

    IS_SAVING_KEY: 'isSaving',

    PAGE_CURTAIN_KEY: 'showPageCurtain',

    NOTIFICATION_ID: 'app-transition-fail',

    getInitialState: function getInitialState() {
        return {
            pageId: null,
            pageData: null,
            isSaving: false
        };
    },

    componentDidMount: function componentDidMount() {
        this.preventPageLeaveWhileSaving();

        UIState.addChangeListener(this.IS_SAVING_KEY, this.handleIsSavingChange);
        Pages.addChangeListener(this.handlePageChange);
        Router.addChangeListener(this.handleRouteChange);

        Router.init();
    },

    /*
     * Checks whether the page is saving
     * before navigating away form the page
     */
    preventPageLeaveWhileSaving: function preventPageLeaveWhileSaving() {
        var _this = this;
        jQuery(document).on('click', 'a', function (e) {

            // add a notification if the user is trying to
            // navigate away from a page while it is saving
            if (_this.state.isSaving && jQuery(this).attr('target') !== '_blank') {
                Notifications.addNotification({
                    id: _this.NOTIFICATION_ID,
                    type: Notifications.notificationTypes.error,
                    text: 'Please wait while page is being saved.'
                });
                e.preventDefault();
            }
        });
    },

    /*
     * Makes triggering the saving state possible
     * by signaling from outside of the component
     */
    handleIsSavingChange: function handleIsSavingChange(v) {
        if (this.state.isSaving !== v) {
            this.setState({ isSaving: v });
        }
    },

    /*
     * handles updates to current page
     * that can be done in the navigation overlay
     */
    handlePageChange: function handlePageChange() {
        var page = Pages.getPageById(this.state.pageId);

        // if page was deleted
        if (!page) {
            Router.goToIndex();
        }

        // if page is unconfirmed
        else if (page.dirty) {
                return;
            }

            // if page was changed to external
            else if (page.type === Pages.pageTypes.external) {
                    Router.goToIndex();
                }

                // if the slug was changed (the current route is now invalid)
                else if (page.slug !== this.pageSlug) {
                        Router.goToPage(this.state.pageId);
                    }
    },

    handleRouteChange: function handleRouteChange(pageSlug) {
        var confirmLeave = true,
            page,
            pageData;

        if (this.state.isSaving) {
            confirmLeave = confirm('The page is saving, you might lose changes. Proceed ?');
        }

        if (!confirmLeave) {
            Router.goBack();
            return;
        }

        page = Pages.getPageBySlug(pageSlug);
        if (!page || page.type !== Pages.pageTypes.internal) {
            Router.goToIndex();
            return;
        }

        this.pageSlug = page.slug;
        if (page.id === this.state.pageId) {
            return;
        }

        // show the curtain & render the page while under it
        UIState.set(this.PAGE_CURTAIN_KEY, true);

        try {
            pageData = JSON.parse(page.data);
        } catch (e) {}
        // do nothing, the try / catch is here for a potential JSON.parse error

        // the hacky timeouts are for the page curtain transition
        setTimeout((function () {
            this.setState({
                pageId: page.id,
                pageData: pageData || Model[VisualPage.type].value
            }, function () {
                // hide the curtain after the page was rendered
                var _this = this;
                setTimeout(function () {
                    UIState.set(_this.PAGE_CURTAIN_KEY, false);
                }, 650);
            });
        }).bind(this), 500);
    },

    handlePageContentChange: function handlePageContentChange(value) {
        this.updatePageOnTheServer(this.state.pageId, value, this.hideSavingFeedback);
        this.setState({ pageData: value, isSaving: true }, function () {
            UIState.set(this.IS_SAVING_KEY, true);
        });
    },

    hideSavingFeedback: function hideSavingFeedback() {
        this.setState({ isSaving: false }, function () {
            Notifications.removeNotification(this.NOTIFICATION_ID);
            UIState.set(this.IS_SAVING_KEY, false);
        });
    },

    updatePageOnTheServer: _.debounce(function (pageId, pageData, onComplete) {
        Pages.updatePage(pageId, { data: JSON.stringify(pageData) }).then(onComplete);
    }, 1000),

    renderPage: function renderPage() {
        if (!this.state.pageData) {
            return null;
        }

        var Page = Visual[VisualPage.type];
        return React.createElement(Page, { blocks: Config.get('blocks'), value: this.state.pageData, onChange: this.handlePageContentChange });
    },

    renderSavingFeedback: function renderSavingFeedback() {
        return this.state.isSaving ? React.createElement(PageSavingFeedback, null) : null;
    },

    render: function render() {
        return React.createElement(
            'div',
            null,
            this.renderPage(),
            this.renderSavingFeedback()
        );
    }

});

module.exports = Editor;

},{"../../../../editor/js/Model":1,"../../../../editor/js/Visual":3,"../../../../editor/js/global/Config":95,"../../../../editor/js/global/Notifications":97,"../../../../editor/js/global/Pages":98,"../../../../editor/js/global/Router":100,"../../../../editor/js/global/UIState":101,"../../../../editor/js/model/visual/VisualPage":156,"./PageSavingFeedback":235}],234:[function(require,module,exports){
'use strict';

var React = (window.React);
var UIState = require('../../../../editor/js/global/UIState');

var PageCurtain = React.createClass({
    displayName: 'PageCurtain',

    getInitialState: function getInitialState() {
        return {
            show: UIState.get('showPageCurtain')
        };
    },
    componentDidMount: function componentDidMount() {
        UIState.addChangeListener('showPageCurtain', this.onUIStateChange);
    },
    onUIStateChange: function onUIStateChange(value) {
        if (value !== this.state.show) {
            this.setState({
                show: value
            });
        }
    },
    render: function render() {
        var style = {
            opacity: this.state.show ? 1 : 0,
            visibility: this.state.show ? 'visible' : 'hidden'
        };
        return React.createElement(
            'div',
            { className: 'visual-page-curtain', style: style },
            React.createElement('div', { className: 'visual-page-spinner' })
        );
    }
});

module.exports = PageCurtain;

},{"../../../../editor/js/global/UIState":101}],235:[function(require,module,exports){
'use strict';

var React = (window.React);

var PageSavingFeedback = React.createClass({
    displayName: 'PageSavingFeedback',

    render: function render() {
        return React.createElement(
            'div',
            { className: 'visual-page-saving-feedback' },
            React.createElement('div', null),
            React.createElement('div', null)
        );
    }
});

module.exports = PageSavingFeedback;

},{}],236:[function(require,module,exports){
'use strict';

var _ = (window._);
var jQuery = (window.jQuery);
var getEditorFonts = require('../../../../wireframes/bootstraps/utils/editorFonts/getEditorFontsByFamily');
var generateFontStylesheet = require('../../../../wireframes/bootstraps/utils/editorFonts/generateFontStylesheet');

function appendEditorFonts() {
    var editorFontFamilies = _.pluck(getEditorFonts(), 'url').join('|');
    jQuery('head').append(generateFontStylesheet(editorFontFamilies));
}

module.exports = appendEditorFonts;

},{"../../../../wireframes/bootstraps/utils/editorFonts/generateFontStylesheet":252,"../../../../wireframes/bootstraps/utils/editorFonts/getEditorFontsByFamily":253}],237:[function(require,module,exports){
'use strict';

var UIState = require('../../../../editor/js/global/UIState');
var getColorSchemeById = require('../../../../wireframes/bootstraps/utils/colorSchemes/getById');
var setColorSchemeToDOM = require('../../../../wireframes/bootstraps/utils/colorSchemes/setToDOM');
var setColorSchemeToGlobals = require('../../../../wireframes/bootstraps/utils/colorSchemes/setToGlobals');

function listenColorSchemesChanges() {
    UIState.addChangeListener('colorScheme', function (colorSchemeId) {
        var selectedColorScheme = getColorSchemeById(colorSchemeId);
        if (selectedColorScheme) {
            setColorSchemeToDOM(selectedColorScheme);
            setColorSchemeToGlobals(selectedColorScheme);
        }
    });
}

module.exports = listenColorSchemesChanges;

},{"../../../../editor/js/global/UIState":101,"../../../../wireframes/bootstraps/utils/colorSchemes/getById":245,"../../../../wireframes/bootstraps/utils/colorSchemes/setToDOM":250,"../../../../wireframes/bootstraps/utils/colorSchemes/setToGlobals":251}],238:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');
var getFromGlobals = require('../../../../wireframes/bootstraps/utils/fontSchemes/getFromGlobals');
var setToDOM = require('../../../../wireframes/bootstraps/utils/fontSchemes/setToDOM');

function listenFontSchemeChanges() {
    Globals.addChangeListener('sidebar.fonts', function () {
        setToDOM(getFromGlobals());
    });
}

module.exports = listenFontSchemeChanges;

},{"../../../../editor/js/global/Globals":96,"../../../../wireframes/bootstraps/utils/fontSchemes/getFromGlobals":257,"../../../../wireframes/bootstraps/utils/fontSchemes/setToDOM":259}],239:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');
var setUserStylesToDOM = require('../../../../wireframes/bootstraps/utils/userStyles/setToDOM');

function listenUserStylesChanges() {
    Globals.addChangeListener('userStyles', function () {
        setUserStylesToDOM(Globals.get('userStyles'));
    });
}

module.exports = listenUserStylesChanges;

},{"../../../../editor/js/global/Globals":96,"../../../../wireframes/bootstraps/utils/userStyles/setToDOM":261}],240:[function(require,module,exports){
'use strict';

var UIState = require('../../../../editor/js/global/UIState');
var getDefaultScheme = require('../../../../wireframes/bootstraps/utils/colorSchemes/getDefault');
var prepareDOM = require('../../../../wireframes/bootstraps/utils/colorSchemes/prepareDOM');
var setToDOM = require('../../../../wireframes/bootstraps/utils/colorSchemes/setToDOM');

function setInitialColorScheme() {
    var defaultColorScheme = getDefaultScheme();

    prepareDOM();
    if (defaultColorScheme) {
        UIState.set('colorScheme', defaultColorScheme.id);
        setToDOM(defaultColorScheme);
    }
}

module.exports = setInitialColorScheme;

},{"../../../../editor/js/global/UIState":101,"../../../../wireframes/bootstraps/utils/colorSchemes/getDefault":246,"../../../../wireframes/bootstraps/utils/colorSchemes/prepareDOM":249,"../../../../wireframes/bootstraps/utils/colorSchemes/setToDOM":250}],241:[function(require,module,exports){
'use strict';

var getFontScheme = require('../../../../wireframes/bootstraps/utils/fontSchemes/get');
var prepareDOM = require('../../../../wireframes/bootstraps/utils/fontSchemes/prepareDOM');
var setToDOM = require('../../../../wireframes/bootstraps/utils/fontSchemes/setToDOM');

function setInitialFontScheme() {
    var initialFontScheme = getFontScheme();

    prepareDOM();
    if (initialFontScheme) {
        setToDOM(initialFontScheme);
    }
}

module.exports = setInitialFontScheme;

},{"../../../../wireframes/bootstraps/utils/fontSchemes/get":255,"../../../../wireframes/bootstraps/utils/fontSchemes/prepareDOM":258,"../../../../wireframes/bootstraps/utils/fontSchemes/setToDOM":259}],242:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');
var setUserStylesToDOM = require('../../../../wireframes/bootstraps/utils/userStyles/setToDOM');

function setInitialUserStyles() {
    setUserStylesToDOM(Globals.get('userStyles'));
}

module.exports = setInitialUserStyles;

},{"../../../../editor/js/global/Globals":96,"../../../../wireframes/bootstraps/utils/userStyles/setToDOM":261}],243:[function(require,module,exports){
'use strict';

var React = (window.React);
var Promise = require('promise');

var ModelDefinition = require('../../../editor/js/ModelDefinition');
var VisualDefinition = require('../../../editor/js/VisualDefinition');

var ProjectLanguages = require('../../../editor/js/global/ProjectLanguages');
var Pages = require('../../../editor/js/global/Pages');
var Globals = require('../../../editor/js/global/Globals');
var UIState = require('../../../editor/js/global/UIState');

var Config = require('../../../editor/js/global/Config');
var visualConfig = __VISUAL_CONFIG__; // global variable set in editor template
var templateConfig = require('visual-template/visual/config');

var PageCurtain = require('./components/PageCurtain');
var Editor = require('./components/Editor');

var appendEditorFonts = require('./tasks/appendEditorFonts');
var setInitialFontScheme = require('./tasks/setInitialFontScheme');
var listenFontSchemeChanges = require('./tasks/listenFontSchemeChanges');
var setInitialColorScheme = require('./tasks/setInitialColorScheme');
var listenColorSchemesChanges = require('./tasks/listenColorSchemesChanges');
var setInitialUserStyles = require('./tasks/setInitialUserStyles');
var listenUserStylesChanges = require('./tasks/listenUserStylesChanges');

// load config
Config.load(visualConfig);
Config.load(templateConfig);

Promise.resolve().then(function () {
    // show page curtain while loading
    var div = document.createElement('DIV');

    document.body.insertBefore(div, document.body.childNodes[0]);
    UIState.set('showPageCurtain', true);
    React.render(React.createElement(PageCurtain, null), div);

    return ProjectLanguages.load();
}).then(function () {
    // start fetching data needed for the render
    var fetchData = Promise.all([Pages.load(), Globals.load()]);

    // load components
    ModelDefinition.populateModel();
    VisualDefinition.populateVisual();

    // render page
    return fetchData;
}).then(function () {
    // prepare page
    appendEditorFonts();

    setInitialFontScheme();
    listenFontSchemeChanges();

    setInitialColorScheme();
    listenColorSchemesChanges();

    setInitialUserStyles();
    listenUserStylesChanges();
}).then(function () {
    // render editor
    var div = document.createElement('DIV');
    document.body.insertBefore(div, document.body.childNodes[0]);
    React.render(React.createElement(Editor, null), div);
})['catch'](function (e) {
    console.log('editor.jsx catch', e);
});

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/global/Config":95,"../../../editor/js/global/Globals":96,"../../../editor/js/global/Pages":98,"../../../editor/js/global/ProjectLanguages":99,"../../../editor/js/global/UIState":101,"./components/Editor":233,"./components/PageCurtain":234,"./tasks/appendEditorFonts":236,"./tasks/listenColorSchemesChanges":237,"./tasks/listenFontSchemeChanges":238,"./tasks/listenUserStylesChanges":239,"./tasks/setInitialColorScheme":240,"./tasks/setInitialFontScheme":241,"./tasks/setInitialUserStyles":242,"promise":"promise","visual-template/visual/config":231}],244:[function(require,module,exports){
'use strict';

var Config = require('../../../../editor/js/global/Config');
var constants = require('../../../../wireframes/bootstraps/constants');

function getFromConfig() {
    return Config.get(constants.COLOR_SCHEMES_CONFIG_KEY) || [];
}

module.exports = getFromConfig;

},{"../../../../editor/js/global/Config":95,"../../../../wireframes/bootstraps/constants":232}],245:[function(require,module,exports){
'use strict';

var _ = (window._);
var Config = require('../../../../editor/js/global/Config');
var constants = require('../../../../wireframes/bootstraps/constants');

function getColorSchemeById(id) {
    var colorSchemes = Config.get(constants.COLOR_SCHEMES_CONFIG_KEY) || [];
    return _.find(colorSchemes, function (colorScheme) {
        return colorScheme.id === id;
    });
}

module.exports = getColorSchemeById;

},{"../../../../editor/js/global/Config":95,"../../../../wireframes/bootstraps/constants":232}],246:[function(require,module,exports){
'use strict';

var getFromGlobals = require('./getFromGlobals');
var getFromConfig = require('./getFromConfig');

function getDefault() {
    return getFromGlobals() || getFromConfig();
}

module.exports = getDefault;

},{"./getFromConfig":247,"./getFromGlobals":248}],247:[function(require,module,exports){
'use strict';

var _ = (window._);
var Config = require('../../../../editor/js/global/Config');
var constants = require('../../../../wireframes/bootstraps/constants');

function getFromConfig() {
    var colorSchemes = Config.get(constants.COLOR_SCHEMES_CONFIG_KEY) || [];
    return _.find(colorSchemes, function (colorScheme) {
        return colorScheme['default'];
    }) || colorSchemes[0];
}

module.exports = getFromConfig;

},{"../../../../editor/js/global/Config":95,"../../../../wireframes/bootstraps/constants":232}],248:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');
var constants = require('../../../../wireframes/bootstraps/constants');
var getById = require('./getById');

function getFromGlobals() {
    var globalsId = Globals.get(constants.COLOR_SCHEMES_GLOBALS_KEY);
    return globalsId && getById(globalsId);
}

module.exports = getFromGlobals;

},{"../../../../editor/js/global/Globals":96,"../../../../wireframes/bootstraps/constants":232,"./getById":245}],249:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

function prepareDOM() {
    jQuery('head').append('<link id="visual-color-scheme" rel="stylesheet">');
}

module.exports = prepareDOM;

},{}],250:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

function setToDOM(colorScheme) {
    jQuery('#visual-color-scheme').attr('href', colorScheme.href);
}

module.exports = setToDOM;

},{}],251:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');
var constants = require('../../../../wireframes/bootstraps/constants');

function setToGlobals(colorScheme) {
    Globals.set(constants.COLOR_SCHEMES_GLOBALS_KEY, colorScheme.id, 'project');
}

module.exports = setToGlobals;

},{"../../../../editor/js/global/Globals":96,"../../../../wireframes/bootstraps/constants":232}],252:[function(require,module,exports){
'use strict';

function generateFontStylesheet(family) {
    return '<link href="http://fonts.googleapis.com/css?family=' + family + '" type="text/css" rel="stylesheet" />';
}

module.exports = generateFontStylesheet;

},{}],253:[function(require,module,exports){
'use strict';

var _ = (window._);
var Config = require('../../../../editor/js/global/Config');
var editorFonts = require('../../../../editor/js/config/fonts');
var parseFontFamily = require('./parseFontFamily');

function getEditorFontsByFamily() {
    var fontsConfig = Config.get('fonts') || {},
        noAutoLoadConfig = fontsConfig.noAutoLoad || [],
        fontsForAutoload = _.omit(editorFonts, noAutoLoadConfig),
        fontMap = {};

    _.each(fontsForAutoload, function (config) {
        _.each(parseFontFamily(config.family), function (s) {
            fontMap[s] = config;
        });
    });

    // delete safe fonts
    delete fontMap['serif'];
    delete fontMap['sans-serif'];
    delete fontMap['cursive'];
    delete fontMap['monospace'];
    delete fontMap['fantasy'];

    // delete fallback fonts that are not in config
    delete fontMap['arial'];
    delete fontMap['helvetica'];
    delete fontMap['helvetica neue'];

    return fontMap;
}

module.exports = _.memoize(getEditorFontsByFamily); // memoize because relative expensive computations

},{"../../../../editor/js/config/fonts":94,"../../../../editor/js/global/Config":95,"./parseFontFamily":254}],254:[function(require,module,exports){
'use strict';

function parseFontFamily(s) {
    return s.split(',').map(function (family) {
        return family.trim().replace(/["';]/g, '').toLowerCase();
    });
}

module.exports = parseFontFamily;

},{}],255:[function(require,module,exports){
'use strict';

var _ = (window._);
var getFromGlobals = require('./getFromGlobals');
var getFromConfig = require('./getFromConfig');

function get() {
    return _.defaults(getFromGlobals(), getFromConfig());
}

module.exports = get;

},{"./getFromConfig":256,"./getFromGlobals":257}],256:[function(require,module,exports){
'use strict';

var _ = (window._);
var Config = require('../../../../editor/js/global/Config');
var allFonts = require('../../../../editor/js/config/fonts');

function getFromConfig() {
    var themeConfigFonts = Config.get('fonts') || {},
        defaultFont = _.keys(allFonts)[0];
    return {
        headings: themeConfigFonts.headings || defaultFont,
        paragraphs: themeConfigFonts.paragraphs || defaultFont
    };
}

module.exports = getFromConfig;

},{"../../../../editor/js/config/fonts":94,"../../../../editor/js/global/Config":95}],257:[function(require,module,exports){
'use strict';

var Globals = require('../../../../editor/js/global/Globals');

function getFromGlobals() {
    return Globals.get('sidebar.fonts') || {};
}

module.exports = getFromGlobals;

},{"../../../../editor/js/global/Globals":96}],258:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

function prepareDOM() {
    jQuery('head').append('<style id="visual-font-scheme">');
}

module.exports = prepareDOM;

},{}],259:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);
var toCss = require('./toCss');

function setToDOM(fontScheme) {
    jQuery('#visual-font-scheme').text(toCss(fontScheme));
}

module.exports = setToDOM;

},{"./toCss":260}],260:[function(require,module,exports){
'use strict';

var _ = (window._);
var FontsConfig = require('../../../../editor/js/config/fonts');
var rulesMap = {
    headings: '#page-container h1,#page-container h2,#page-container h3,#page-container h4',
    paragraphs: '#page-container p'
};

function toCss(fontScheme) {
    return _.map(fontScheme, function (font, key) {
        return rulesMap[key] + '{font-family:' + FontsConfig[font].family + ';}';
    }).join('');
}

module.exports = toCss;

},{"../../../../editor/js/config/fonts":94}],261:[function(require,module,exports){
'use strict';

var jQuery = (window.jQuery);

function setToDOM(css) {
    var $userStylesNode = jQuery('#visual-user-styles');
    if (!$userStylesNode.length) {
        $userStylesNode = jQuery('<style id="visual-user-styles"></style>');
        jQuery('head').append($userStylesNode);
    }
    $userStylesNode.html(css ? css.trim() : '');
}

module.exports = setToDOM;

},{}],262:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Background',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualPrivate = require('../../../editor/js/model/basic/private'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualImage = require('../../../editor/js/model/generic/Image'),
    VisualOpacity = require('../../../editor/js/model/generic/Opacity'),
    VisualColor = require('../../../editor/js/model/generic/Color'),
    BarNoExtend = require('../../../editor/js/component/bar/BarNoExtend'),
    MiscUtils = require('../../../editor/js/helper/utils/MiscUtils'),
    colorUtils = require('../utils/color');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		toolbarProps: VisualPrivate.property(null), // optional
		colorClassName: VisualString.property(null), // optional
		image: VisualImage.property({
			size: '1920x*xR'
		}),
		opacity: VisualOpacity.property(),
		color: VisualColor.property()
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	OPACITY_BREAKPOINT: 80,
	defaultProps: {
		className: ''
	},
	onBeforeShowOpacity: function onBeforeShowOpacity(item) {
		var opacityString = jQuery(this.refs['colorLayer'].getDOMNode()).css('opacity');
		item.value = Number(opacityString) * 100;
	},
	onBeforeShowColor: function onBeforeShowColor(item) {
		var colorString = jQuery(this.refs['colorLayer'].getDOMNode()).css('background-color');
		var hex = colorUtils.getHEXFromColorString(colorString);
		item.value = hex;
	},
	onPreviewOpacity: function onPreviewOpacity(v) {
		jQuery(this.refs['colorLayer'].getDOMNode()).css('opacity', Number(v) / 100);
	},
	onPreviewColor: function onPreviewColor(v) {
		jQuery(this.refs['colorLayer'].getDOMNode()).css('background-color', v);
	},
	onPreviewImage: function onPreviewImage(v) {
		var currentV = this.value();
		var $imageLayer = jQuery(this.refs['imageLayer'].getDOMNode());

		$imageLayer.trigger('background-on-preview-visual', v);
		$imageLayer.css('background-image', 'url("' + v + '")');

		if (currentV.opacity > this.OPACITY_BREAKPOINT) {
			this.onPreviewOpacity(this.OPACITY_BREAKPOINT);
		}
	},
	onChangeImage: function onChangeImage(changedV) {
		var oldV = this.value();

		/*
   * Drop the opacity when uploading an image and the opacity is high
   * If we don't then the user will not see anything because the color would be opaque
   */
		if (oldV.opacity > this.OPACITY_BREAKPOINT) {
			var patch = {
				opacity: this.OPACITY_BREAKPOINT,
				image: changedV
			};
			var newV = _.extend({}, oldV, patch);
			this.props.onChange(newV);
		} else {
			this.handleChange('image', changedV);
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var colorClassName = 'bg-color' + (v.colorClassName ? ' ' + v.colorClassName : ''),
		    imageClassName = 'bg-image' + (this.props.className ? ' ' + this.props.className : ''),
		    colorStyle = {},
		    imageStyle = {},
		    opacityToolbarProps = {},
		    colorToolbarProps = _.extend({ inside: true }, v.toolbarProps);

		// v.opacity == null is intentionally not v.opacity === null and not !v.opacity
		// as opacity may be 0, thus a valid falsy value
		if (v.opacity == null || v.opacity === 'computed') {
			opacityToolbarProps.onBeforeShow = this.onBeforeShowOpacity;
		} else {
			colorStyle.opacity = Number(v.opacity) / 100;
		}

		if (!v.color || v.color === 'computed') {
			colorToolbarProps.onBeforeShow = this.onBeforeShowColor;
		} else {
			colorStyle.backgroundColor = v.color;
		}

		var hasImage = v.image && v.image.src;
		var atExport = MiscUtils.isPreviewMode();
		var colorFullyOpaque = v.opacity === 100;
		if (hasImage && !(atExport && colorFullyOpaque)) {
			imageStyle.backgroundImage = 'url("' + v.image.src + '")';
		}

		return React.createElement(
			Vi,
			{
				property: 'opacity',
				onPreview: this.onPreviewOpacity,
				toolbarProps: opacityToolbarProps
			},
			React.createElement(
				Vi,
				{
					property: 'color',
					onPreview: this.onPreviewColor,
					toolbarProps: colorToolbarProps
				},
				React.createElement(
					Vi,
					{
						property: 'image',
						onPreview: this.onPreviewImage,
						onChange: this.onChangeImage
					},
					React.createElement(
						'div',
						{ ref: 'imageLayer', className: imageClassName, style: imageStyle },
						React.createElement('div', { ref: 'colorLayer', className: colorClassName, style: colorStyle }),
						React.createElement(
							'div',
							{ className: 'bg-content' },
							React.createElement('div', { className: 'bg-padding' }),
							React.createElement(
								BarNoExtend,
								null,
								this.props.children
							)
						)
					)
				)
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/bar/BarNoExtend":80,"../../../editor/js/helper/utils/MiscUtils":127,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/private":140,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Color":144,"../../../editor/js/model/generic/Image":146,"../../../editor/js/model/generic/Opacity":149,"../utils/color":300}],263:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Button',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualText = require('../../../editor/js/model/generic/Text'),
    VisualLink = require('../../../editor/js/model/generic/Link'),
    VisualColor = require('../../../editor/js/model/generic/Color'),
    Link = require('../../../editor/js/component/Link'),
    colorUtils = require('../utils/color');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property(),
		text: VisualText.property(),
		link: VisualLink.property(),
		color: VisualColor.property(),
		type: VisualString.property(null) // optional
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	onBeforeShowColor: function onBeforeShowColor(item) {
		// border color works for both regular and outlined buttons
		var colorString = jQuery(this.refs.link.getDOMNode()).css('border-color');
		var hex = colorUtils.getHEXFromColorString(colorString);
		item.value = hex;
	},
	onPreviewColor: function onPreviewColor(value) {
		var s = this.getStyle(value);
		jQuery(this.refs.link.getDOMNode()).css(s);
	},
	getColorToolbarProps: function getColorToolbarProps() {
		var v = this.value(),
		    colorToolbarProps = {};

		if (!v.color || v.color === 'computed') {
			colorToolbarProps.onBeforeShow = this.onBeforeShowColor;
		}

		return colorToolbarProps;
	},
	getClassName: function getClassName() {
		var v = this.value(),
		    className = v.className || '';

		return className + (v.type ? ' btn-' + v.type : ' btn-base');
	},
	getStyle: function getStyle(color) {
		var v = this.value(),
		    color = color || v.color,
		    style = {};

		if (color && color !== 'computed') {
			style = {
				borderColor: color
			};

			if (v.type === 'outlined') {
				style.color = color;
			} else {
				style.background = color;
			}
		}

		return style;
	},
	getContent: function getContent() {
		var v = this.props.value;
		return v.text ? v.text : React.createElement('br', null);
	},
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			'div',
			{ className: 'shortcode-button' },
			React.createElement(
				Vi,
				{ property: 'color', onPreview: this.onPreviewColor, toolbarProps: this.getColorToolbarProps() },
				React.createElement(
					Vi,
					{ property: 'link', trigger: 'click', locked: true, ref: 'link' },
					React.createElement(
						Link,
						{ href: v.link, className: this.getClassName(), style: this.getStyle() },
						React.createElement(
							Vi,
							{
								property: 'text',
								onFocus: _.noop,
								onBlur: _.noop
							},
							React.createElement(
								'span',
								null,
								this.getContent()
							)
						)
					)
				)
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/Link":6,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Color":144,"../../../editor/js/model/generic/Link":147,"../../../editor/js/model/generic/Text":152,"../utils/color":300}],264:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Countdown',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Visual = require('../../../../editor/js/Visual'),
    Model = require('../../../../editor/js/Model'),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    VisualPrivate = require('../../../../editor/js/model/basic/private'),
    Text = require('../../../../wireframes/visual/shortcodes/Text'),
    Utils = require('./utils');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property(''),
		lastChanged: VisualString.property(''),
		days: VisualPrivate.property(),
		hours: VisualPrivate.property(),
		minutes: VisualPrivate.property(),
		seconds: VisualPrivate.property()
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	componentDidMount: function componentDidMount() {
		var v = this.value();
		if (!v.lastChanged) {
			this.handleChange('lastChanged', this.getTimestampFromValue(v));
		}
	},
	onNumberChange: function onNumberChange(part, changedValue) {
		var oldValue = this.value(),
		    patch = {},
		    newValue;

		patch[part] = {
			number: changedValue.text,
			label: oldValue[part].label
		};
		newValue = _.extend({}, oldValue, patch);
		newValue.lastChanged = this.getTimestampFromValue(newValue);

		this.props.onChange(newValue);
	},
	onLabelChange: function onLabelChange(part, v) {
		this.handleChange(part + '.label', v.text);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-countdown' + (v.className ? ' ' + v.className : '');
	},
	getTimestampFromValue: function getTimestampFromValue(v) {
		// Utils.getTimestamp takes into account the server time
		// the timestamp is in seconds, we need to convert it to ms because of JS
		var currentDate = new Date(Utils.getTimestamp() * 1000),
		    correctedValue = correctValue(v);

		currentDate.setDate(currentDate.getDate() + parseInt(correctedValue.days));
		currentDate.setHours(currentDate.getHours() + parseInt(correctedValue.hours));
		currentDate.setMinutes(currentDate.getMinutes() + parseInt(correctedValue.minutes));
		currentDate.setSeconds(currentDate.getSeconds() + parseInt(correctedValue.seconds));

		return isNaN(currentDate.getTime()) ? 0 : Math.floor(currentDate.getTime() / 1000); // back to seconds

		function correctValue(v) {
			var tmp;
			tmp = _.pick(v, ['days', 'hours', 'minutes', 'seconds']);
			tmp = _.mapObject(tmp, function (o) {
				return o.number;
			});
			tmp = _.defaults(tmp, {
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 0
			});
			return tmp;
		}
	},
	renderPart: function renderPart(name) {
		var v = this.value(),
		    vNumber,
		    vLabel,
		    number,
		    label,
		    className;

		if (!v[name]) {
			return null;
		}

		vNumber = String(v[name].number);
		number = React.createElement(Visual, {
			model: Model[Text.type],
			value: { className: 'countdown-number', text: vNumber, pattern: '\\d' },
			onChange: this.onNumberChange.bind(null, name)
		});
		if (v[name].label) {
			// if label isn't set it's not rendered
			vLabel = v[name].label;
			label = React.createElement(Visual, {
				model: Model[Text.type],
				value: { className: 'countdown-label', text: vLabel },
				onChange: this.onLabelChange.bind(null, name)
			});
		}

		className = 'countdown-item countdown-' + name + (!Utils.isValidNumber(parseInt(vNumber), name) ? ' error' : '');
		return React.createElement(
			'div',
			{ className: className },
			number,
			label
		);
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var className = this.getClassName(),
		    endTime = v.lastChanged || this.getTimestampFromValue(v);
		return React.createElement(
			'div',
			{ className: className, 'data-end': endTime },
			this.renderPart('days'),
			this.renderPart('hours'),
			this.renderPart('minutes'),
			this.renderPart('seconds')
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/Model":1,"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/Visual":3,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/private":140,"../../../../editor/js/model/basic/string":141,"../../../../wireframes/visual/shortcodes/Text":288,"./utils":265}],265:[function(require,module,exports){
'use strict';

var Config = require('../../../../editor/js/global/Config');
var pageLoadTime = Math.floor(Date.now() / 1000);

function isValidNumber(number, name) {
    if (isNaN(number)) {
        return false;
    }

    switch (name) {
        case 'days':
            return true;
        case 'hours':
            return number >= 0 && number <= 23;
        case 'minutes':
            return number >= 0 && number <= 59;
        case 'seconds':
            return number >= 0 && number <= 59;
        default:
            return false;
    }
}

function getTimestamp() {
    var serverTime = parseInt(Config.get('serverTimestamp')),
        currentTime = Math.floor(Date.now() / 1000),
        delta = currentTime - pageLoadTime;
    return serverTime + delta;
}

module.exports = {
    isValidNumber: isValidNumber,
    getTimestamp: getTimestamp
};

},{"../../../../editor/js/global/Config":95}],266:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Divider',
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property('')
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getClassName() },
			React.createElement('div', null)
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-divider' + (v.className ? ' ' + v.className : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141}],267:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.EmbedMap',
    React = (window.React),
    jQuery = (window.jQuery),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualMap = require('../../../../editor/js/model/generic/Map'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    BarNoExtend = require('../../../../editor/js/component/bar/BarNoExtend');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		map: VisualMap.property(),
		className: VisualString.property('')
	}
});

VisualDefinition[T] = VisualDefinition.extend({

	componentDidMount: function componentDidMount() {
		var $node = jQuery(this.getDOMNode());

		$node.on("click", function () {
			$node.children('iframe').css("pointer-events", "auto");
		}).on('mouseleave', function () {
			$node.children('iframe').css("pointer-events", "none");
		});
	},

	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			Vi,
			{ property: 'map' },
			React.createElement('div', { className: this.getClassName(), dangerouslySetInnerHTML: { __html: v.map } })
		);
	},

	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-embed-map' + (v.className ? ' ' + v.className : '');
	}

});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/BarNoExtend":80,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141,"../../../../editor/js/model/generic/Map":148}],268:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.FixedImage',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualPrivate = require('../../../editor/js/model/basic/private'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualImage = require('../../../editor/js/model/generic/Image'),
    VisualLink = require('../../../editor/js/model/generic/Link'),
    Link = require('../../../editor/js/component/Link'),
    isNullOrUndefined = require('../utils/isNullOrUndefined');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		toolbarProps: VisualPrivate.property(null), // optional
		className: VisualString.property(''), // optional
		image: VisualImage.property(),
		link: VisualLink.property(null) // optional
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	handlePreview: function handlePreview(v) {
		if (_.isFunction(this.props.onPreview)) {
			this.props.onPreview(v);
		} else if (this.refs.image) {
			jQuery(this.refs.image.getDOMNode()).css('background-image', this.getBgSource(v));
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var toolbarProps = v.toolbarProps;

		var ret = React.createElement(
			Vi,
			{
				property: 'image',
				onPreview: this.handlePreview,
				toolbarProps: toolbarProps
			},
			React.createElement('div', {
				ref: 'image',
				className: 'image-fix',
				style: { backgroundImage: this.getBgSource() }
			})
		);

		if (!isNullOrUndefined(v.link)) {
			ret = React.createElement(
				Vi,
				{ property: 'link' },
				React.createElement(
					Link,
					{ href: v.link },
					ret
				)
			);
		}

		return React.createElement(
			'div',
			{ className: this.getClassName() },
			ret
		);
	},
	renderForView: function renderForView(v, Vi) {
		var ret = React.createElement('img', _extends({
			src: this.getSource()
		}, _.pick(this.props, 'alt')));

		if (!isNullOrUndefined(v.link)) {
			ret = React.createElement(
				Link,
				{ href: v.link },
				ret
			);
		}

		return React.createElement(
			'div',
			{ className: this.getClassName() },
			ret
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-image' + (v.className ? ' ' + v.className : '');
	},
	getSource: function getSource() {
		var v = this.props.value;
		return v.image.src;
	},
	getBgSource: function getBgSource(source) {
		try {
			var s = source || this.getSource();
			return 'url("' + s + '")';
		} catch (e) {
			return 'none';
		}
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/Link":6,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/private":140,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Image":146,"../../../editor/js/model/generic/Link":147,"../utils/isNullOrUndefined":301}],269:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.FluidImage',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualPrivate = require('../../../editor/js/model/basic/private'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualImage = require('../../../editor/js/model/generic/Image'),
    VisualLink = require('../../../editor/js/model/generic/Link'),
    Link = require('../../../editor/js/component/Link'),
    isNullOrUndefined = require('../utils/isNullOrUndefined');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		toolbarProps: VisualPrivate.property(null), // optional
		className: VisualString.property(''), // optional
		image: VisualImage.property(),
		link: VisualLink.property(null) // optional
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	handlePreview: function handlePreview(v) {
		if (_.isFunction(this.props.onPreview)) {
			this.props.onPreview(v);
		} else if (this.refs.image) {
			jQuery(this.refs.image.getDOMNode()).attr('src', v);
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var toolbarProps = v.toolbarProps;

		var ret = React.createElement(
			Vi,
			{
				property: 'image',
				onPreview: this.handlePreview,
				toolbarProps: toolbarProps
			},
			React.createElement('img', _extends({
				ref: 'image',
				src: v.image.src
			}, _.pick(this.props, 'alt')))
		);

		if (!isNullOrUndefined(v.link)) {
			ret = React.createElement(
				Vi,
				{ property: 'link' },
				React.createElement(
					Link,
					{ href: v.link },
					ret
				)
			);
		}

		return React.createElement(
			'div',
			{ className: this.getClassName() },
			ret
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-image' + (v.className ? ' ' + v.className : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/Link":6,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/private":140,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Image":146,"../../../editor/js/model/generic/Link":147,"../utils/isNullOrUndefined":301}],270:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Items',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualArrayByBar = require('../../../../editor/js/model/basic/arrayByBar'),
    columnClassNameByWidth = require('./utils').columnClassNameByWidth;

ModelDefinition[T] = VisualArrayByBar.ModelDefinition.extend({
	items: ['Wireframes.Shortcodes.Input']
});

VisualDefinition[T] = VisualArrayByBar.VisualDefinition.extend({
	defaultProps: {
		//minItems: 1,
		//maxItems: 9999,
		toolbarProps: {
			addEvent: true,
			trigger: 'click',
			locked: 'true'
		}
	},
	wrapContainer: function wrapContainer(inputs) {
		var v = this.value();

		return React.createElement(
			'div',
			{ className: 'row form-row' + (this.props.formType == "inline" && v.length <= this.props.columns ? ' cols-center-xs' : '') },
			inputs,
			this.props.submit
		);
	},
	wrapItem: function wrapItem(item, itemIndex, itemValue) {
		var v = this.value(),
		    columnClassName;

		if (this.props.formType == "inline" || v.length < this.props.columns) {
			columnClassName = itemValue.width == "1" || itemValue.width == null || itemValue.type == "textarea" ? columnClassNameByWidth(1) : this.props.itemClassName;
		} else {
			columnClassName = columnClassNameByWidth(itemValue.width);
		}

		return React.createElement(
			'div',
			{ className: columnClassName },
			item
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/model/basic/arrayByBar":136,"./utils":278}],271:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Submit.Messages',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Bar = require('../../../../../editor/js/component/bar/Bar');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
    success: VisualString.property('Default Success Message'),
    error: VisualString.property('Default Error Message')
});

VisualDefinition[T] = VisualDefinition.extend({
    renderForEdit: function renderForEdit(v, Vi) {
        return React.createElement(
            Bar,
            {
                item: 'message',
                value: v,
                onChange: this.props.onChange
            },
            this.props.children
        );
    },
    renderForView: function renderForView(v, Vi) {
        return this.props.children;
    }
});

module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/component/bar/Bar":67,"../../../../../editor/js/model/basic/object":139,"../../../../../editor/js/model/basic/string":141}],272:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Submit',
    _ = (window._),
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    Button = require('../../../../../wireframes/visual/shortcodes/Button'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    VisualMessages = require('./Messages');

ModelDefinition[T] = Button.ModelDefinition.extend({
	properties: {
		width: VisualString.property(''),
		messages: VisualMessages.property()
	}
});

VisualDefinition[T] = Button.VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		var colorToolbarProps = _.extend({
			trigger: 'click',
			locked: true
		}, this.getColorToolbarProps());

		var successMessage = v.messages && v.messages.success ? v.messages.success : '',
		    errorMessage = v.messages && v.messages.error ? v.messages.error : '';

		return React.createElement(
			'div',
			{ className: 'form-field form-field-submit' },
			React.createElement(
				Vi,
				{ property: 'messages' },
				React.createElement(
					Vi,
					{ property: 'color', onPreview: this.onPreviewColor, toolbarProps: colorToolbarProps },
					React.createElement(
						'button',
						{
							ref: 'link',
							className: this.getClassName(),
							style: this.getStyle(),
							'data-success': successMessage,
							'data-error': errorMessage
						},
						React.createElement(
							Vi,
							{
								property: 'text',
								onFocus: _.noop,
								onBlur: _.noop
							},
							React.createElement(
								'span',
								null,
								this.getContent()
							)
						)
					)
				)
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Button":263,"./Messages":271}],273:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.Form',
    crypto = require('crypto'),
    _ = (window._),
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Config = require('../../../../editor/js/global/Config'),
    FormItems = require('../../../../wireframes/visual/shortcodes/Form/Items'),
    FormSubmit = require('../../../../wireframes/visual/shortcodes/Form/Submit'),
    columnClassNameByWidth = require('./utils').columnClassNameByWidth,
    columnsToClassNames = require('./utils').columnsToClassNames,
    generateNameAttribute = require('./utils').generateNameAttribute;

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		items: FormItems.property([]),
		submit: FormSubmit.property(),
		columns: VisualString.property(''),
		formType: VisualString.property(null) // optional
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	onSubmit: function onSubmit(event) {
		event.preventDefault();
		event.stopPropagation();
	},
	getDefaultItemClassName: function getDefaultItemClassName() {
		var v = this.value(),
		    columnCount = v.columns,
		    numItems = v.items.length;

		if (numItems < columnCount) {
			if (v.formType == "inline") {
				numItems++;
			}
			return columnsToClassNames(numItems);
		}

		return columnsToClassNames(columnCount);
	},
	getSubmit: function getSubmit() {
		var v = this.value(),
		    Vi = this._Vi,
		    submitColumnClassName = columnClassNameByWidth(v.submit.width) + ' col-submit';
		return React.createElement(
			'div',
			{ className: submitColumnClassName },
			React.createElement(Vi, { property: 'submit' })
		);
	},
	renderForEdit: function renderForEdit(v, Vi) {
		if (!v.items.length) {
			return null;
		}

		var itemClassName = v.columns ? this.getDefaultItemClassName() : '';
		return React.createElement(
			'div',
			{ className: 'shortcode-form' },
			React.createElement(
				'form',
				{ action: '#', onSubmit: this.onSubmit },
				React.createElement(Vi, _extends({
					property: 'items',
					submit: this.getSubmit(),
					itemClassName: itemClassName
				}, _.omit(v, 'submit', 'itemClassName')))
			)
		);
	},
	renderForView: function renderForView(v, Vi) {
		if (!v.items.length) {
			return null;
		}

		var action = Config.get('baseUrl') + '/form/submit',
		    secretKey = Config.get('editorSecret'),
		    projectLanguage = Config.get('projectLanguage'),
		    formStructure = getFormStructure(this.value()),
		    hash = getHash(secretKey, projectLanguage, formStructure),
		    itemClassName = v.columns ? this.getDefaultItemClassName() : '';
		return React.createElement(
			'div',
			{ className: 'shortcode-form' },
			React.createElement(
				'form',
				{
					action: action,
					method: 'post',
					'data-project-language': projectLanguage,
					'data-hash': hash
				},
				React.createElement(Vi, _extends({
					property: 'items',
					submit: this.getSubmit(),
					itemClassName: itemClassName
				}, _.omit(v, 'submit', 'itemClassName')))
			)
		);

		function getFormStructure(v) {
			var fields = _.pluck(v.items, 'value');
			return _.sortBy(_.map(fields, function (field) {
				var label = field.label || field.placeholder;
				return generateNameAttribute(label.toLowerCase());
			}));
		}
		function getHash(secretKey, projectLanguage, formStructure) {
			return crypto.createHmac('sha256', secretKey).update(JSON.stringify(formStructure) + projectLanguage).digest('base64');
		}
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/global/Config":95,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141,"../../../../wireframes/visual/shortcodes/Form/Items":270,"../../../../wireframes/visual/shortcodes/Form/Submit":272,"./utils":278,"crypto":165}],274:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Input',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../../editor/js/model/basic/string');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		label: VisualString.property(''),
		placeholder: VisualString.property(''),
		width: VisualString.property('')
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: null,
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/object":139,"../../../../../editor/js/model/basic/string":141}],275:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Select',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Model = require('../../../../../editor/js/Model'),
    Visual = require('../../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    Text = require('../../../../../wireframes/visual/shortcodes/Text'),
    FormInput = require('./Input'),
    VisualPrivate = require('../../../../../editor/js/model/basic/private'),
    generateNameAttribute = require('../utils').generateNameAttribute;

ModelDefinition[T] = FormInput.ModelDefinition.extend({
	options: VisualPrivate.property()
});

VisualDefinition[T] = VisualDefinition.extend({
	getInitialState: function getInitialState() {
		return {
			opened: false
		};
	},
	componentDidMount: function componentDidMount() {
		jQuery(window).on('click', this.onOutsideClick);
	},
	componentWillUnmount: function componentWillUnmount() {
		jQuery(window).off('click', this.onOutsideClick);
	},

	onOutsideClick: function onOutsideClick(event) {
		if (jQuery(event.target).closest(jQuery(this.getDOMNode())).length === 0) {
			this.setState({
				opened: false
			});
		}
	},
	onDropdownOpen: function onDropdownOpen() {
		this.setState({
			opened: true
		});
	},
	onAddOptionKeyDown: function onAddOptionKeyDown(event) {
		// add option if enter keys is pressed
		if (event.which === 13) {
			event.preventDefault();
			this.onAddOption(event);
		}
	},
	onAddOption: function onAddOption(event) {
		event.stopPropagation();
		var addNewInput = this.refs.addNewInput.getDOMNode();
		if (addNewInput.value) {
			var options = this.value().options;
			options.push(addNewInput.value);
			addNewInput.value = '';
			this.handleChange('options', options);
		}
	},
	onChangeOption: function onChangeOption(index, value) {
		var options = this.value().options;
		options.splice(index, 1, value);
		this.handleChange('options', options);
	},
	onDeleteOption: function onDeleteOption(index, event) {
		event.stopPropagation();
		var options = this.value().options;
		options.splice(index, 1);
		this.handleChange('options', options);
	},
	onChangePlaceholder: _.debounce(function () {
		this.handleChange('placeholder', this.refs.placeholderInput.getDOMNode().value);
	}, 1000),

	renderForEdit: function renderForEdit(v, Vi) {
		var options = _.map(v.options, function (option, index) {
			return React.createElement(
				'div',
				{ className: 'select-drop-item clearfix', key: index },
				React.createElement(Visual, {
					model: Model[Text.type],
					value: { text: option },
					onChange: this.onChangeOption.bind(null, index)
				}),
				React.createElement(
					'div',
					{
						className: 'select-icon-delete',
						title: 'Delete this option',
						onClick: this.onDeleteOption.bind(null, index)
					},
					React.createElement('i', { className: 'visual-icon-remove' })
				)
			);
		}, this);

		return React.createElement(
			'div',
			{ className: 'form-field form-field-select' },
			React.createElement(
				'div',
				{ className: 'select-styled' + (this.state.opened ? ' opened' : '') },
				React.createElement(
					'div',
					{ className: 'select-label', onClick: this.onDropdownOpen },
					React.createElement('input', {
						ref: 'placeholderInput',
						type: 'text',
						placeholder: 'Set placeholder',
						defaultValue: v.placeholder,
						onChange: this.onChangePlaceholder
					})
				),
				React.createElement(
					'div',
					{ className: 'select-drop visual-dd-ignore' },
					options,
					React.createElement(
						'div',
						{ className: 'select-drop-item-new clearfix' },
						React.createElement('input', {
							ref: 'addNewInput',
							type: 'text',
							placeholder: 'Add new option',
							defaultValue: '',
							onKeyDown: this.onAddOptionKeyDown
						}),
						React.createElement(
							'div',
							{ className: 'select-icon-add', title: 'Add new option', onClick: this.onAddOption },
							React.createElement('i', { className: 'visual-icon-arrow-save' })
						)
					)
				)
			)
		);
	},
	renderForView: function renderForView(v, Vi) {
		var inputName = generateNameAttribute((v.label || v.placeholder).toLowerCase());
		var options = _.map(v.options, function (option) {
			return React.createElement(
				'div',
				{ className: 'select-drop-item clearfix' },
				React.createElement(Visual, {
					model: Model[Text.type],
					value: { text: option }
				})
			);
		}, this);

		return React.createElement(
			'div',
			{ className: 'form-field form-field-select' },
			React.createElement(
				'div',
				{ className: 'select-styled' },
				React.createElement(
					'div',
					{ className: 'select-label' },
					React.createElement('input', {
						type: 'text',
						name: inputName,
						placeholder: v.placeholder,
						defaultValue: v.placeholder,
						readOnly: true
					})
				),
				React.createElement(
					'div',
					{ className: 'select-drop' },
					options
				)
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/Model":1,"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/Visual":3,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/private":140,"../../../../../wireframes/visual/shortcodes/Text":288,"../utils":278,"./Input":274}],276:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.Form.Text',
    _ = (window._),
    React = (window.React),
    Visual = require('../../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    FormInput = require('./Input'),
    generateNameAttribute = require('../utils').generateNameAttribute;

ModelDefinition[T] = FormInput.ModelDefinition.extend({});

VisualDefinition[T] = VisualDefinition.extend({
	onChange: _.debounce(function (property) {
		this.handleChange(property, this.refs.input.getDOMNode().value);
	}, 1000),
	getInput: function getInput() {
		var editor = Visual.renderMethod === 'renderForEdit',
		    v = this.value(),
		    props = { ref: 'input' };

		if (editor) {
			props.defaultValue = v.placeholder;
			props.onChange = this.onChange.bind(null, 'placeholder');
		} else {
			props.placeholder = v.placeholder;
			props.name = generateNameAttribute((v.label || v.placeholder).toLowerCase());
		}

		return React.createElement('input', _extends({}, props, { type: 'text' }));
	},
	render: function render() {
		var className = 'form-field form-field-text',
		    input = this.getInput();
		return React.createElement(
			'div',
			{ className: className },
			input
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/Visual":3,"../../../../../editor/js/VisualDefinition":4,"../utils":278,"./Input":274}],277:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Form.Textarea',
    _ = (window._),
    React = (window.React),
    Visual = require('../../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    FormInput = require('./Input'),
    generateNameAttribute = require('../utils').generateNameAttribute;

ModelDefinition[T] = FormInput.ModelDefinition.extend({});

VisualDefinition[T] = VisualDefinition.extend({
	onChange: _.debounce(function (property) {
		this.handleChange(property, this.refs.input.getDOMNode().value);
	}, 1000),
	getInput: function getInput() {
		var editor = Visual.renderMethod === 'renderForEdit',
		    v = this.value(),
		    props = { ref: 'input' };

		if (editor) {
			props.defaultValue = v.placeholder;
			props.onChange = this.onChange.bind(null, 'placeholder');
		} else {
			props.placeholder = v.placeholder;
			props.name = generateNameAttribute((v.label || v.placeholder).toLowerCase());
		}

		return React.createElement('textarea', props);
	},
	render: function render() {
		var className = 'form-field form-field-textarea',
		    input = this.getInput();
		return React.createElement(
			'div',
			{ className: className },
			input
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/Visual":3,"../../../../../editor/js/VisualDefinition":4,"../utils":278,"./Input":274}],278:[function(require,module,exports){
'use strict';

var _ = (window._);

var columnClassNamesByWidth = {
	'1': 'col-xs-12 col-sm-12',
	'1/2': 'col-xs-12 col-sm-6',
	'1/3': 'col-xs-12 col-sm-4',
	'1/4': 'col-xs-12 col-sm-6 col-md-3',
	'1/5': 'col-xs-12 col-md-4 col-lg-5th-1',
	'1/6': 'col-xs-12 col-sm-4 col-lg-2'
};

var _columnsToClassNames = {
	1: 'col-xs-12 col-sm-12',
	2: 'col-xs-12 col-sm-6',
	3: 'col-xs-12 col-sm-4',
	4: 'col-xs-12 col-sm-6 col-md-3',
	5: 'col-xs-12 col-md-4 col-lg-5th-1',
	6: 'col-xs-12 col-sm-4 col-lg-2'
};

module.exports = {
	columnsToClassNames: function columnsToClassNames(columns) {
		if (!_columnsToClassNames.hasOwnProperty(columns)) {
			throw new Error('invalid columns values: ' + columns + '. Only one of ' + _.keys(_columnsToClassNames) + ' allowed.');
		}
		return _columnsToClassNames[columns];
	},
	columnClassNameByWidth: function columnClassNameByWidth(width) {
		return columnClassNamesByWidth[width] || columnClassNamesByWidth['1'];
	},
	generateNameAttribute: function generateNameAttribute(str) {
		var cleaned = str && str.replace(/[_\s]/g, '_');
		return cleaned || _.uniqueId('empty_field_');
	}
};

},{}],279:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Icon',
    jQuery = (window.jQuery),
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualIcon = require('../../../editor/js/model/generic/Icon'),
    VisualLink = require('../../../editor/js/model/generic/Link'),
    VisualColor = require('../../../editor/js/model/generic/Color'),
    Link = require('../../../editor/js/component/Link'),
    colorUtils = require('../utils/color'),
    isNullOrUndefined = require('../utils/isNullOrUndefined');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property(''),
		icon: VisualIcon.property(),
		link: VisualLink.property(null),
		color: VisualColor.property(null)
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	onBeforeShowColor: function onBeforeShowColor(item) {
		var colorString = jQuery(this.refs.icon.getDOMNode()).css('color');
		var hex = colorUtils.getHEXFromColorString(colorString);
		item.value = hex;
	},
	onPreviewColor: function onPreviewColor(value) {
		jQuery(this.refs.icon.getDOMNode()).css('color', value);
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var has = {
			link: !isNullOrUndefined(v.link),
			color: !isNullOrUndefined(v.color)
		},
		    colorToolbarProps = {},
		    iconClassName = v.icon + (v.className ? ' ' + v.className : ''),
		    iconStyle = {},
		    ret;

		if (has.color) {
			if (v.color === 'computed') {
				colorToolbarProps.onBeforeShow = this.onBeforeShowColor;
			} else {
				iconStyle.color = v.color;
			}
		}

		ret = React.createElement('i', { ref: 'icon', className: iconClassName, style: iconStyle });
		if (has.link) {
			ret = React.createElement(
				Link,
				{ href: v.link },
				ret
			);
		}

		// wrap in Vi
		ret = React.createElement(
			Vi,
			{ property: 'icon' },
			ret
		);
		if (has.link) {
			ret = React.createElement(
				Vi,
				{ property: 'link' },
				ret
			);
		}
		if (has.color) {
			ret = React.createElement(
				Vi,
				{ property: 'color', onPreview: this.onPreviewColor, toolbarProps: colorToolbarProps },
				ret
			);
		}

		return React.createElement(
			'div',
			{ className: 'shortcode-icon' },
			ret
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/Link":6,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Color":144,"../../../editor/js/model/generic/Icon":145,"../../../editor/js/model/generic/Link":147,"../utils/color":300,"../utils/isNullOrUndefined":301}],280:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.ImageCaption.Items',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualArray = require('../../../../editor/js/model/basic/array');

ModelDefinition[T] = VisualArray.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArray.VisualDefinition.extend({
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'div',
			{ className: 'shortcode-image-caption-content' },
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return item;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/model/basic/array":135}],281:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.ImageCaption',
    React = (window.React),
    jQuery = (window.jQuery),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    VisualLink = require('../../../../editor/js/model/generic/Link'),
    VisualImage = require('../../../../editor/js/model/generic/Image'),
    Link = require('../../../../editor/js/component/Link'),
    ImageCaptionItems = require('../../../../wireframes/visual/shortcodes/ImageCaption/Items');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		image: VisualImage.property(),
		items: ImageCaptionItems.property(),
		link: VisualLink.property(null),
		className: VisualString.property('')
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	onPreview: function onPreview(v) {
		jQuery(this.refs.image.getDOMNode()).css('background-image', 'url("' + v + '")');
	},
	componentDidMount: function componentDidMount() {
		var $node = jQuery(this.getDOMNode()),
		    overClass = 'hover';

		this.setDefaultActive();

		$node.addClass('visual-mouseover-content-editable').on('mouseenter', function () {
			$node.addClass('visual-mouseover-content-editable-over');
		}).on('mouseleave', function () {
			$node.removeClass('visual-mouseover-content-editable-over');
		}).on('mouseenter visual.editableBlockOver', function () {
			$node.closest('.block').find('.shortcode-image-caption').removeClass('active');
			$node.addClass('hover active');
		}).on('mouseleave visual.editableBlockOut', function () {
			if ($node.find('.visual-has-locked-bar').length === 0) {
				$node.removeClass(overClass);
			}
		}).on('visual-bar-locked-hide.visual visual-bar-translated.visual', function () {
			setTimeout(function () {
				if ($node.find('.visual-has-locked-bar').length === 0 && !$node.is('.visual-mouseover-content-editable-over')) {
					$node.removeClass(overClass);
				}
			}, 0);
		});
	},
	componentDidUpdate: function componentDidUpdate() {
		this.setDefaultActive();
	},
	setDefaultActive: function setDefaultActive() {
		// tmp hack to set default active when in cloneable to the second item
		var $block = jQuery(this.getDOMNode()).closest('.block');
		if (!$block.find('.shortcode-image-caption.active').length) {
			$block.find('.block-item').eq(1).find('.shortcode-image-caption').addClass('active');
		}
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var style = {};

		if (v.image && v.image.src) {
			style = { backgroundImage: 'url("' + v.image.src + '")' };
		}

		return React.createElement(
			Vi,
			{ property: 'image', onPreview: this.onPreview },
			React.createElement(
				Vi,
				{ property: 'link' },
				React.createElement(
					'div',
					{ className: this.getClassName() },
					React.createElement(
						Link,
						{ href: v.link },
						React.createElement('div', { className: 'shortcode-image-caption-media', ref: 'image', style: style })
					),
					React.createElement(Vi, { property: 'items' })
				)
			)
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-image-caption' + (v.className ? ' ' + v.className : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/Link":6,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141,"../../../../editor/js/model/generic/Image":146,"../../../../editor/js/model/generic/Link":147,"../../../../wireframes/visual/shortcodes/ImageCaption/Items":280}],282:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.LogoImage',
    React = (window.React),
    _ = (window._),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    FluidImage = require('../../../wireframes/visual/shortcodes/FluidImage'),
    Link = require('../../../editor/js/component/Link');

ModelDefinition[T] = FluidImage.ModelDefinition.extend({});

VisualDefinition[T] = FluidImage.VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		var toolbarProps = v.toolbarProps || {};

		return React.createElement(
			'div',
			{ className: this.getClassName() },
			React.createElement(
				Link,
				{ href: 'page:index' },
				React.createElement(
					Vi,
					{
						property: 'image',
						onPreview: this.handlePreview,
						toolbarProps: toolbarProps
					},
					React.createElement('img', _extends({
						ref: 'image',
						src: v.image.src
					}, _.pick(this.props, 'alt')))
				)
			)
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-logo' + (v.className ? ' ' + v.className : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/component/Link":6,"../../../wireframes/visual/shortcodes/FluidImage":269}],283:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Menu',
    jQuery = (window.jQuery),
    _ = (window._),
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    Menu = require('../../../../editor/js/model/complex/Menu'),
    MenuLink = require('../../../../editor/js/model/complex/Menu/MenuLink');

ModelDefinition[T] = Menu.ModelDefinition.extend({
	properties: {
		menuId: VisualString.property()
	}
});

VisualDefinition[T] = Menu.VisualDefinition.extend({
	getInitialState: function getInitialState() {
		return {
			menuId: _.uniqueId('mmenu-')
		};
	},

	componentDidMount: function componentDidMount() {
		if (this.menu.multiLevel) {
			this.navOffsetInit();
			this.mmenuInit();
		}
	},

	componentDidUpdate: function componentDidUpdate() {
		if (this.menu.multiLevel) {
			this.navOffsetUpdate();
			this.mmenuRemove();
			this.mmenuInit();
		}
	},

	componentWillUnmount: function componentWillUnmount() {
		if (this.menu.multiLevel) {
			this.navOffsetRemove();
			this.mmenuRemove();
		}
	},

	navOffsetInit: function navOffsetInit() {
		jQuery(this.refs.dropdownNav.getDOMNode()).navOffset();
	},

	navOffsetUpdate: function navOffsetUpdate() {
		jQuery(this.refs.dropdownNav.getDOMNode()).navOffset('refresh');
	},

	navOffsetRemove: function navOffsetRemove() {
		jQuery(this.refs.dropdownNav.getDOMNode()).navOffset('destroy');
	},

	mmenuInit: function mmenuInit() {
		var $nav = jQuery(this.refs.mmenuNav.getDOMNode());
		var $clonedNav = $nav.clone();

		$clonedNav.removeAttr("data-reactid");
		$clonedNav.find("[data-reactid]").removeAttr("data-reactid");
		$clonedNav.mmenu(
		// options
		{
			onClick: {
				preventDefault: false,
				close: true
			},
			navbar: {
				title: false
			},
			offCanvas: {
				position: 'top'
				//zposition: 'next'
			},
			autoHeight: true,
			extensions: ["theme-dark"]
		},
		// config
		{
			clone: true,
			offCanvas: {
				pageSelector: '#page-container'
			}
		});
	},

	mmenuRemove: function mmenuRemove() {
		// manually remove what mmenu plugin has appended
		jQuery('#mm-' + this.state.menuId).remove();
	},

	renderContainer: function renderContainer(children, depth) {
		return this.menu.multiLevel ? this.renderMultiLevelContainer(children, depth) : this.renderSingleLevelContainer(children, depth);
	},
	renderItem: function renderItem(item, depth) {
		return this.menu.multiLevel ? this.renderMultiLevelItem(item, depth) : this.renderSingleiLevelItem(item, depth);
	},

	renderMultiLevelContainer: function renderMultiLevelContainer(children, depth) {

		if (depth === 0) {
			return React.createElement(
				'div',
				{ className: 'shortcode-menu' },
				React.createElement(
					'nav',
					{ role: 'navigation', className: 'site-navigation', id: this.state.menuId, ref: 'mmenuNav' },
					React.createElement(
						'ul',
						{ className: 'nav-top clearfix', ref: 'dropdownNav' },
						children
					)
				),
				React.createElement(
					'a',
					{ href: '#' + this.state.menuId, className: 'mmenu-link' },
					React.createElement('i', { className: 'icon-mobile-menu' })
				)
			);
		} else {
			return React.createElement(
				'ul',
				{ className: 'sub-menu' },
				children
			);
		}
	},
	renderMultiLevelItem: function renderMultiLevelItem(item, depth) {
		var hasChildren = this.itemHasChildren(item),
		    hasOnlyOneChild = this.itemChildrenCount(item) === 1,
		    liClassNames = [];

		if (hasChildren) {
			liClassNames.push('menu-item-has-children');
		}

		if (hasOnlyOneChild) {
			liClassNames.push('menu-item-has-one-child');
		}

		if (this.itemIsCurrent(item)) {
			liClassNames.push('current-menu-item');
		}

		if (this.itemHasCurrent(item)) {
			liClassNames.push('current-menu-parent');
		}

		var children = hasChildren ? this.renderTree(item, depth + 1) : null;
		return React.createElement(
			'li',
			{ className: liClassNames.join(' ') },
			React.createElement(
				MenuLink,
				{ item: item },
				React.createElement(
					'span',
					null,
					item.title
				)
			),
			children
		);
	},

	renderSingleLevelContainer: function renderSingleLevelContainer(children, depth) {
		var ul = React.createElement(
			'ul',
			null,
			children
		);

		if (depth === 0) {
			return React.createElement(
				'div',
				{ className: 'shortcode-menu' },
				React.createElement(
					'nav',
					{ role: 'navigation', className: 'site-navigation' },
					ul
				)
			);
		} else {
			return ul;
		}
	},
	renderSingleiLevelItem: function renderSingleiLevelItem(item, depth) {
		var hasChildren = this.itemHasChildren(item),
		    liClassNames = [];

		if (hasChildren) {
			liClassNames.push('menu-item-has-children');
		}

		if (this.itemIsCurrent(item)) {
			liClassNames.push('current-menu-item');
		}

		if (this.itemHasCurrent(item)) {
			liClassNames.push('current-menu-parent');
		}

		var children = hasChildren ? this.renderTree(item, depth + 1) : null;
		return React.createElement(
			'li',
			{ className: liClassNames.join(' ') },
			React.createElement(
				MenuLink,
				{ item: item },
				React.createElement(
					'span',
					null,
					item.title
				)
			),
			children
		);
	}

});

// Each {Model,Visual}Definition module should exports {Model,Visual}Definitions.
// That allows to use module in the following way:
//
//   var VisualDefinition = require('module/name').VisualDefinition,
//   var ModuleDefinition = require('module/name').ModuleDefinition
//
// Without this we need to require('module/name') at the top of the file,
// which proves to be error prone, since its too easy to forget about it.
module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/model/basic/string":141,"../../../../editor/js/model/complex/Menu":143,"../../../../editor/js/model/complex/Menu/MenuLink":142}],284:[function(require,module,exports){
"use strict";

var React = (window.React);

var Controls = React.createClass({
    displayName: "Controls",

    shouldComponentUpdate: function shouldComponentUpdate() {
        return false;
    },
    render: function render() {
        return React.createElement("div", { className: "owl-controls" });
    }
});

module.exports = Controls;

},{}],285:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.OwlCarousel.Items',
    _ = (window._),
    jQuery = (window.jQuery),
    React = (window.React),
    Visual = require('../../../../editor/js/Visual'),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualArray = require('../../../../editor/js/model/basic/array'),
    Bar = require('../../../../editor/js/component/bar/Bar'),
    Controls = require('./Controls');

ModelDefinition[T] = VisualArray.ModelDefinition.extend({
    items: '*'
});

VisualDefinition[T] = VisualArray.VisualDefinition.extend({

    defaultProps: {
        className: ''
    },

    getInitialState: function getInitialState() {
        return {
            sliderId: _.uniqueId('slider-')
        };
    },

    componentWillMount: function componentWillMount() {
        this.appendCloned = [];
        this.prependCloned = [];
        this.itemsCount = this.value().length;
        this.playing = true;
        this.lastHeight = 0;
        this.slideMoveNow = false;
        this.options = _.extend(__SHORTCODES_CONFIG__[this.props.configKey] || {}, this.props.config || { items: 1, responsive: false } // these are needed for render they are not set into
        // defaultProps because the parent might send null
        );
    },

    componentDidMount: function componentDidMount() {
        var _this = this;
        var $node = jQuery(this.getDOMNode());

        this.pluginAttach();

        // resetting the .cloned elements
        this.appendCloned = [];
        this.prependCloned = [];
        this.itemsCount = this.value().length;
        this.slideMoveNow = false;
        this.lastHeight = $node.find('div[contenteditable]').height();

        $node.find('.owl-controls').on('mouseenter', function (event) {
            $node.find('.active .bg-image').find('.slider-content-middle').trigger('mouseenter');

            event.stopPropagation();
        });

        $node.find('.owl-stage-outer').on('mouseenter', function () {
            _this.stopAutoPlay();
        }).on('mouseleave', function () {
            if ($node.find('div[contenteditable]').is(':focus')) {
                _this.stopAutoPlay();
            } else {
                _this.startAutoPlay();
            }
        }).on('stop.player', function () {
            _this.stopAutoPlay();
        });

        $node.find('.bg-image').on('background-on-preview-visual', function (event, value) {
            var dataItems = jQuery(event.target).closest('.owl-item').attr('data-item');
            $node.find('[data-item="' + dataItems + '"]').not(jQuery(event.target)).find('.bg-image').css('background-image', 'url("' + value + '")');
        });

        $node.find('.owl-stage .owl-item').on('visual.bar', function (event) {
            if (_this.slideMoveNow) {
                event.stopPropagation();
            }
        });
    },

    startAutoPlay: function startAutoPlay() {
        var $node = jQuery(this.getDOMNode());
        this.playing = true;
        $node.data('playing', true);
        $node.trigger('mouseleave.owl.autoplay');
    },

    stopAutoPlay: function stopAutoPlay() {
        var $node = jQuery(this.getDOMNode());
        this.playing = false;
        $node.data('playing', false);
        $node.trigger('stop.owl.autoplay');
    },

    componentDidUpdate: function componentDidUpdate() {
        var $node = jQuery(this.getDOMNode()),
            owlApi = $node.data('owlCarousel'),
            currentItem = owlApi._current,
            $currentItem = $node.find('div[contenteditable]').eq(currentItem);

        this.appendCloned = [];
        this.prependCloned = [];

        $node.trigger('stop.owl.autoplay');

        var valueCount = this.value().length;
        if (valueCount !== this.itemsCount) {
            var activeElement = $node.find('.active .bg-image');

            this.itemsCount = valueCount;
            currentItem = currentItem === valueCount ? currentItem - 1 : currentItem;

            setTimeout(function () {
                $node.find('.owl-wrapper .owl-item').eq(currentItem).find('.slider-content-middle').trigger('visual.bar-out');

                setTimeout(function () {
                    activeElement.trigger('visual.bar', [{}]);
                }, 0);
            }, 50);

            this.pluginUpdate();
        } else {
            if (this.lastHeight && this.lastHeight != $currentItem.height()) {
                this.pluginRefresh();
                this.lastHeight = $currentItem.height();
            }
        }

        this.slideMoveNow = false;
    },

    componentWillUnmount: function componentWillUnmount() {
        this.pluginRemove();
    },

    pluginAttach: function pluginAttach(startPosition) {
        var _this = this;
        var $node = jQuery(_this.getDOMNode());
        var settings = _this.options;
        var options = _.extend({}, settings, {
            autoplayHoverPause: true,
            startPosition: startPosition || 0,
            onTranslate: function onTranslate() {
                hideBar();
                if (typeof settings.onTranslate === 'function') {
                    settings.onTranslate.call(this);
                }
            },
            onTranslated: function onTranslated() {
                showBar();
                if (typeof settings.onTranslated === 'function') {
                    settings.onTranslated.call(this);
                }
            }
        });

        $node.owlCarousel(options);
        $node.trigger(_this.playing && settings.autoplay ? 'mouseleave.owl.autoplay' : 'stop.owl.autoplay');

        function hideBar() {
            _this.slideMoveNow = true;
            if (!_this.playing) {
                $node.find('.owl-stage .owl-item').find('.slider-content-middle').trigger('visual.bar-out');
            }
        }

        function showBar() {
            _this.slideMoveNow = false;
            if (!_this.playing) {
                var currentItem = $node.data('owlCarousel')._current;
                $node.find('.owl-stage .owl-item').eq(currentItem).find('.slider-content-middle').trigger('mouseover');
            }
        }
    },

    pluginUpdate: function pluginUpdate() {
        var $node = jQuery(this.getDOMNode());
        var owlApi = $node.data('owlCarousel');
        var currentItem = owlApi.relative(owlApi._current);

        this.pluginRemove();
        this.pluginAttach(currentItem);
    },

    pluginRefresh: function pluginRefresh() {
        var $node = jQuery(this.getDOMNode());
        var owlApi = $node.data('owlCarousel');

        owlApi.onResize();
    },

    pluginRemove: function pluginRemove() {
        var $node = jQuery(this.getDOMNode());
        var owlApi = $node.data('owlCarousel');

        owlApi.destroy();
    },

    wrapContainer: function wrapContainer(items) {
        var controls = this.value().length > 1 ? React.createElement(Controls, null) : null;
        return React.createElement(
            'div',
            {
                id: this.state.sliderId,
                className: "shortcode-owl-carousel owl-carousel owl-loading " + this.props.className,
                'data-config-key': this.props.configKey
            },
            React.createElement(
                'div',
                { className: 'owl-stage-outer', id: this.props.blockId },
                React.createElement(
                    'div',
                    { className: 'owl-stage' },
                    this.prependCloned,
                    items,
                    this.appendCloned
                )
            ),
            controls
        );
    },

    wrapItem: function wrapItem(item, itemIndex) {
        var correctedItem = this.props.itemProps ? React.addons.cloneWithProps(item, this.props.itemProps) : item,
            responsive = this.options.responsive,
            items = responsive ? 1 : this.options.items,
            delta = 0 - Math.max(items * 2, 4),
            n = Math.abs(delta / 2),
            totalItems = this.value().length;

        if (itemIndex >= totalItems - n) {
            this.prependCloned.push(this.getElementCloned(correctedItem, itemIndex, true));
        }
        if (itemIndex < n) {
            this.appendCloned.push(this.getElementCloned(correctedItem, itemIndex, true));
        }

        return this.getElementCloned(correctedItem, itemIndex);
    },

    getElementCloned: function getElementCloned(item, itemIndex, cloned) {
        var classCloned = cloned ? ' cloned' : '';
        var dataItem = (cloned ? 'owl-slide-number-' : 'owl-slide-number-') + itemIndex;
        var hideRemove = this.value().length === 1;
        return React.createElement(
            Bar,
            { item: 'remove', onClick: this.remove.bind(null, itemIndex), hideIt: hideRemove },
            React.createElement(
                Bar,
                { item: 'clone', onClick: this.duplicate.bind(null, itemIndex), debounce: false },
                React.createElement(
                    'div',
                    { 'data-item': dataItem, className: 'owl-item' + classCloned },
                    item
                )
            )
        );
    }

});

module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/Visual":3,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/Bar":67,"../../../../editor/js/model/basic/array":135,"./Controls":284}],286:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.OwlCarousel',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    VisualPrivate = require('../../../../editor/js/model/basic/private'),
    OwlCarouselItems = require('../../../../wireframes/visual/shortcodes/OwlCarousel/Items');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
    properties: {
        className: VisualString.property(''),
        configKey: VisualString.property('invalid owlCarousel config key'),
        config: VisualPrivate.property(null), /* this is mostly a hack needed to somehow render the slider for export */
        items: OwlCarouselItems.property([])
    }
});

VisualDefinition[T] = VisualDefinition.extend({
    renderForEdit: function renderForEdit(v, Vi) {
        if (!v.configKey) {
            throw new Error('OwlCarousel requires a `configKey` property to configure the slider plugin');
        }

        var extraProps = {};
        if (this.props.contextValue) {
            extraProps.itemProps = {
                contextValue: this.props.contextValue
            };
        }

        return React.createElement(Vi, _extends({
            property: 'items',
            blockId: v.blockId,
            className: v.className,
            configKey: v.configKey,
            config: v.config /* this is mostly a hack needed to somehow render the slider for export */
        }, extraProps));
    }
});

module.exports = {
    ModelDefinition: ModelDefinition[T],
    VisualDefinition: VisualDefinition[T],
    type: T,
    property: function property(value) {
        return { type: T, value: value };
    }
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/private":140,"../../../../editor/js/model/basic/string":141,"../../../../wireframes/visual/shortcodes/OwlCarousel/Items":285}],287:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.RichText',
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualRichText = require('../../../editor/js/model/generic/RichText');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property(''),
		text: VisualRichText.property('RichText default...')
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getClassName() },
			React.createElement(Vi, { property: 'text' })
		);
	},
	renderForView: function renderForView(v, Vi) {
		return React.createElement(Vi, { property: 'text', className: this.getClassName() });
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-text' + (v.className ? ' ' + v.className : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/RichText":151}],288:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Text',
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualText = require('../../../editor/js/model/generic/Text');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		className: VisualString.property(''),
		text: VisualText.property('Text default...'),
		pattern: VisualString.property('')
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getClassName() },
			React.createElement(
				Vi,
				{ property: 'text', pattern: v.pattern },
				React.createElement(
					'p',
					null,
					this.getContent()
				)
			)
		);
	},
	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-text' + (v.className ? ' ' + v.className : '');
	},
	getContent: function getContent() {
		var v = this.props.value;
		return v.text ? v.text : React.createElement('br', null);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141,"../../../editor/js/model/generic/Text":152}],289:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.VideoButton',
    React = (window.React),
    jQuery = (window.jQuery),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../editor/js/model/basic/object'),
    VisualVideo = require('../../../../editor/js/model/generic/Video'),
    VisualString = require('../../../../editor/js/model/basic/string'),
    BarNoExtend = require('../../../../editor/js/component/bar/BarNoExtend'),
    getVideoUrl = require('../../../../editor/js/helper/utils/UrlUtils').getVideoUrl;

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		video: VisualVideo.property(),
		iconSize: VisualString.property() // icon-small, icon-medium, icon-large
	}
});

VisualDefinition[T] = VisualDefinition.extend({

	popupInit: function popupInit(target) {
		jQuery(target).magnificPopup({
			disableOn: 700,
			type: 'iframe',
			mainClass: 'mfp-fade',
			removalDelay: 160,
			preloader: false,
			fixedContentPos: false
		});
	},

	componentDidMount: function componentDidMount() {
		this.popupInit('.js-popup-video');
	},

	getVideoUrlOptions: function getVideoUrlOptions() {
		var v = this.props.value,
		    ret,
		    src = getVideoUrl(v.video, 'url');

		if (v.type == "youtube") {
			ret = src + "?showinfo=0&autoplay=1";
		} else if (v.type == "vimeo") {
			ret = src + "?title=0&byline=0&autoplay=1";
		} else {
			ret = src;
		}
		return ret;
	},

	renderForEdit: function renderForEdit(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getClassName() },
			React.createElement(
				Vi,
				{ property: 'video' },
				React.createElement(
					'a',
					{ className: 'js-popup-video', href: this.getVideoUrlOptions() },
					React.createElement('i', { className: 'icon-play' })
				)
			)
		);
	},

	getClassName: function getClassName() {
		var v = this.props.value;
		return 'shortcode-video-modal' + (v.iconSize ? ' ' + v.iconSize : '');
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../editor/js/component/bar/BarNoExtend":80,"../../../../editor/js/helper/utils/UrlUtils":129,"../../../../editor/js/model/basic/object":139,"../../../../editor/js/model/basic/string":141,"../../../../editor/js/model/generic/Video":153}],290:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBarDiv.Items',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArrayByBar = require('../../../../../editor/js/model/basic/arrayByBar');

ModelDefinition[T] = VisualArrayByBar.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArrayByBar.VisualDefinition.extend({
	defaultProps: {
		containerClassName: '',
		itemClassName: ''
	},
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'div',
			{ className: 'block ' + this.props.containerClassName },
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return React.createElement(
			'div',
			{ className: 'block-item ' + this.props.itemClassName },
			item
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/arrayByBar":136}],291:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBarDiv',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualPrivate = require('../../../../../editor/js/model/basic/private'),
    CloneableGeneric = require('../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric'),
    CloneableByBarDivItems = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv/Items');

ModelDefinition[T] = CloneableGeneric.ModelDefinition.extend({
	properties: {
		toolbarProps: VisualPrivate.property(null), // optional
		items: CloneableByBarDivItems.property([])
	}
});

VisualDefinition[T] = CloneableGeneric.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/private":140,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarDiv/Items":290,"../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric":297}],292:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBarList.Items',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArrayByBar = require('../../../../../editor/js/model/basic/arrayByBar');

ModelDefinition[T] = VisualArrayByBar.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArrayByBar.VisualDefinition.extend({
	defaultProps: {
		containerClassName: '',
		itemClassName: ''
	},
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'ul',
			{ className: 'list ' + this.props.containerClassName },
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return React.createElement(
			'li',
			{ className: 'list-item ' + this.props.itemClassName },
			item
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/arrayByBar":136}],293:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBarList',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualPrivate = require('../../../../../editor/js/model/basic/private'),
    CloneableGeneric = require('../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric'),
    CloneableByBarListItems = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList/Items');

ModelDefinition[T] = CloneableGeneric.ModelDefinition.extend({
	properties: {
		toolbarProps: VisualPrivate.property(null), // optional
		items: CloneableByBarListItems.property([])
	}
});

VisualDefinition[T] = CloneableGeneric.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/private":140,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBarList/Items":292,"../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric":297}],294:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBlock.Items',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArrayByBlock = require('../../../../../editor/js/model/basic/arrayByBlock');

ModelDefinition[T] = VisualArrayByBlock.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArrayByBlock.VisualDefinition.extend({
	defaultProps: {
		containerClassName: '',
		itemClassName: ''
	},
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'div',
			{ className: 'block ' + this.props.containerClassName },
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return React.createElement(
			'div',
			{ className: 'block-item ' + this.props.itemClassName },
			item
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/arrayByBlock":137}],295:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableByBlock',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    CloneableGeneric = require('../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric'),
    CloneableByBlockItems = require('../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock/Items');

ModelDefinition[T] = CloneableGeneric.ModelDefinition.extend({
	properties: {
		items: CloneableByBlockItems.property([])
	}
});

VisualDefinition[T] = CloneableGeneric.VisualDefinition.extend({});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../wireframes/visual/shortcodes/containers/CloneableByBlock/Items":294,"../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric":297}],296:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.CloneableGeneric.Items',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArrayByBlock = require('../../../../../editor/js/model/basic/arrayByBlock');

ModelDefinition[T] = VisualArrayByBlock.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArrayByBlock.VisualDefinition.extend({
	defaultProps: {
		containerClassName: '',
		itemClassName: ''
	},
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'div',
			{ className: this.props.containerClassName },
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return React.createElement(
			'div',
			{ className: this.props.itemClassName },
			item
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/arrayByBlock":137}],297:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var T = 'Wireframes.Shortcodes.CloneableGeneric',
    React = (window.React),
    _ = (window._),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    CloneableGenericItems = require('../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric/Items');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		containerClassName: VisualString.property(''),
		itemClassName: VisualString.property(''),
		columns: VisualString.property(''), // grid columns for largest screen
		maxItems: VisualString.property(''),
		minItems: VisualString.property(''),
		items: CloneableGenericItems.property([])
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		var alignClassName = v.items.length < v.columns ? " grid-center" : "",
		    containerClassName = 'row ' + v.containerClassName + alignClassName,
		    itemClassName = 'col-xs',
		    maxItems = Number(v.maxItems) || 9999,
		    minItems = Number(v.minItems) || 0;

		if (v.maxItems) {
			// Adding class when max-items is set. Made for custom styling
			containerClassName += ' items-count-' + v.items.length;
		}
		if (v.itemClassName) {
			itemClassName += ' ' + v.itemClassName;
		}

		return React.createElement(Vi, _extends({
			property: 'items',
			containerClassName: containerClassName,
			itemClassName: itemClassName,
			maxItems: maxItems,
			minItems: minItems

			/* this allows us to pass extended props (as in CloneableByBar) */
		}, _.omit(v, 'containerClassName', 'itemClassName', 'maxItems', 'minItems')));
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/object":139,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/containers/CloneableGeneric/Items":296}],298:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Div.Items',
    React = (window.React),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualArray = require('../../../../../editor/js/model/basic/array');

ModelDefinition[T] = VisualArray.ModelDefinition.extend({
	items: '*'
});

VisualDefinition[T] = VisualArray.VisualDefinition.extend({
	wrapContainer: function wrapContainer(children) {
		return React.createElement(
			'div',
			null,
			children
		);
	},
	wrapItem: function wrapItem(item, itemIndex) {
		return item;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/array":135}],299:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Shortcodes.Div',
    React = (window.React),
    _ = (window._),
    ModelDefinition = require('../../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../../../editor/js/model/basic/object'),
    VisualString = require('../../../../../editor/js/model/basic/string'),
    Background = require('../../../../../wireframes/visual/shortcodes/Background'),
    DivItems = require('../../../../../wireframes/visual/shortcodes/containers/Div/Items');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		background: Background.property(null),
		className: VisualString.property(''),
		items: DivItems.property([])
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	renderForEdit: function renderForEdit(v, Vi) {
		return this.props.value.background ? this.renderWithBackground(v, Vi) : this.renderWithoutBackground(v, Vi);
	},
	renderWithBackground: function renderWithBackground(v, Vi) {
		return React.createElement(
			Vi,
			{ property: 'background', className: v.className },
			React.createElement(Vi, { property: 'items' })
		);
	},
	renderWithoutBackground: function renderWithoutBackground(v, Vi) {
		return React.createElement(Vi, { property: 'items', className: v.className });
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../../editor/js/ModelDefinition":2,"../../../../../editor/js/VisualDefinition":4,"../../../../../editor/js/model/basic/object":139,"../../../../../editor/js/model/basic/string":141,"../../../../../wireframes/visual/shortcodes/Background":262,"../../../../../wireframes/visual/shortcodes/containers/Div/Items":298}],300:[function(require,module,exports){
"use strict";

var hexRegex = /^#(?:[A-Fa-f0-9]{3}){1,2}$/; // taken from http://stackoverflow.com/questions/32673760/how-can-i-know-if-a-given-string-is-hex-rgb-rgba-or-hsl-color-using-javascipt#answer-32685393
var rgbRegex = /^rgb\s*[(]\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*[)]$/;
var rgbaRegex = /^rgba\s*[(]\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0*\.\d+|1(?:\.0*)?)\s*[)]$/;

function rgb2hex(rgb) {
    return "#" + ("0" + rgb[0].toString(16)).slice(-2) + ("0" + rgb[1].toString(16)).slice(-2) + ("0" + rgb[2].toString(16)).slice(-2);
}

module.exports = {

    getHEXFromColorString: function getHEXFromColorString(colorString) {
        if (this.isInHEX(colorString)) {
            return colorString;
        }

        var rgbResult = this.parseRGB(colorString);
        if (rgbResult) {
            return rgb2hex(rgbResult);
        }

        var rgbaResult = this.parseRGBA(colorString);
        if (rgbaResult) {
            return rgb2hex(rgbaResult);
        }

        return null;
    },

    isInHEX: function isInHEX(colorString) {
        return hexRegex.test(colorString);
    },

    parseRGB: function parseRGB(colorString) {
        var matches = rgbRegex.exec(colorString);
        return matches && matches.slice(1).map(Number);
    },

    parseRGBA: function parseRGBA(colorString) {
        var matches = rgbaRegex.exec(colorString);
        return matches && matches.slice(1).map(Number);
    }

};

},{}],301:[function(require,module,exports){
"use strict";

module.exports = function (v) {
    return v === null || v === undefined;
};

},{}],302:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe1-1',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],303:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe1-2',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' }),
				React.createElement(Vi, { property: 'items2' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],304:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe1-3',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property(),
		items3: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' }),
				React.createElement(Vi, { property: 'items2' }),
				React.createElement(Vi, { property: 'items3' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],305:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe2-1',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property()

	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' })
			),
			React.createElement(
				'div',
				{ className: 'row row-2' },
				React.createElement(Vi, { property: 'items2' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],306:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe2-3',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property(),
		items3: Div.property(),
		items4: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' })
			),
			React.createElement(
				'div',
				{ className: 'row row-2' },
				React.createElement(Vi, { property: 'items2' }),
				React.createElement(Vi, { property: 'items3' }),
				React.createElement(Vi, { property: 'items4' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],307:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe2-4',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property(),
		items3: Div.property(),
		items4: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' }),
				React.createElement(Vi, { property: 'items2' }),
				React.createElement(Vi, { property: 'items3' })
			),
			React.createElement(
				'div',
				{ className: 'row row-2' },
				React.createElement(Vi, { property: 'items4' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],308:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe3-1',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property(),
		items3: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' })
			),
			React.createElement(
				'div',
				{ className: 'row row-2' },
				React.createElement(Vi, { property: 'items2' })
			),
			React.createElement(
				'div',
				{ className: 'row row-3' },
				React.createElement(Vi, { property: 'items3' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],309:[function(require,module,exports){
'use strict';

var T = 'Wireframes.Wireframe3-2',
    React = (window.React),
    ModelDefinition = require('../../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../../editor/js/VisualDefinition'),
    WireframeBase = require('../../../../wireframes/visual/wireframes/WireframeBase'),
    Div = require('../../../../wireframes/visual/shortcodes/containers/Div');

ModelDefinition[T] = WireframeBase.ModelDefinition.extend({
	properties: {
		items1: Div.property(),
		items2: Div.property(),
		items3: Div.property(),
		items4: Div.property(),
		items5: Div.property(),
		items6: Div.property()
	}
});

VisualDefinition[T] = WireframeBase.VisualDefinition.extend({
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			React.createElement(
				'div',
				{ className: 'row row-1' },
				React.createElement(Vi, { property: 'items1' }),
				React.createElement(Vi, { property: 'items2' }),
				React.createElement(Vi, { property: 'items3' })
			),
			React.createElement(
				'div',
				{ className: 'row row-2' },
				React.createElement(Vi, { property: 'items4' })
			),
			React.createElement(
				'div',
				{ className: 'row row-3' },
				React.createElement(Vi, { property: 'items5' }),
				React.createElement(Vi, { property: 'items6' })
			)
		);
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../../editor/js/ModelDefinition":2,"../../../../editor/js/VisualDefinition":4,"../../../../wireframes/visual/shortcodes/containers/Div":299,"../../../../wireframes/visual/wireframes/WireframeBase":310}],310:[function(require,module,exports){
'use strict';

var T = 'Wireframes.WireframeBase',
    React = (window.React),
    ModelDefinition = require('../../../editor/js/ModelDefinition'),
    VisualDefinition = require('../../../editor/js/VisualDefinition'),
    VisualObject = require('../../../editor/js/model/basic/object'),
    VisualString = require('../../../editor/js/model/basic/string'),
    VisualBoolean = require('../../../editor/js/model/basic/boolean'),
    Background = require('../../../wireframes/visual/shortcodes/Background');

ModelDefinition[T] = VisualObject.ModelDefinition.extend({
	properties: {
		sectionBackground: Background.property(null),
		sectionFullWidth: VisualBoolean.property(false),
		sectionClassName: VisualString.property(''),
		containerClassName: VisualString.property('')
	}
});

VisualDefinition[T] = VisualDefinition.extend({
	shouldComponentUpdate: function shouldComponentUpdate(nextProps) {
		//console.log('wireframe shouldUpdate', this._displayName,
		//	(nextProps.value !== this.props.value) || (nextProps.contextValue !== this.props.contextValue));

		return nextProps.value !== this.props.value || nextProps.contextValue !== this.props.contextValue;
	},
	renderForEdit: function renderForEdit(v, Vi) {
		var content = this.props.value.sectionBackground ? this.renderWithBackground(v, Vi) : this.renderWithoutBackground(v, Vi);
		return React.createElement(
			'section',
			{ id: v.blockId, className: v.sectionClassName },
			content
		);
	},
	renderWithBackground: function renderWithBackground(v, Vi) {
		return React.createElement(
			Vi,
			{ property: 'sectionBackground' },
			this.renderContainer(v, Vi)
		);
	},
	renderWithoutBackground: function renderWithoutBackground(v, Vi) {
		return this.renderContainer(v, Vi);
	},
	renderContainer: function renderContainer(v, Vi) {
		return React.createElement(
			'div',
			{ className: this.getContainerClassName() },
			'Default Wireframe!!!'
		);
	},
	getContainerClassName: function getContainerClassName() {
		var v = this.props.value,
		    className;

		className = v.sectionFullWidth ? 'container-fluid' : 'container';
		if (v.containerClassName) {
			className += ' ' + v.containerClassName;
		}

		return className;
	}
});

module.exports = {
	ModelDefinition: ModelDefinition[T],
	VisualDefinition: VisualDefinition[T],
	type: T,
	property: function property(value) {
		return { type: T, value: value };
	}
};

},{"../../../editor/js/ModelDefinition":2,"../../../editor/js/VisualDefinition":4,"../../../editor/js/model/basic/boolean":138,"../../../editor/js/model/basic/object":139,"../../../editor/js/model/basic/string":141,"../../../wireframes/visual/shortcodes/Background":262}]},{},[243]);
