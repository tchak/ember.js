var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

Ember.State = Ember.Object.extend(Ember.Evented, {
  isState: true,
  parentState: null,
  start: null,
  name: null,
  path: Ember.computed(function() {
    var parentPath = getPath(this, 'parentState.path'),
        path = get(this, 'name');

    if (parentPath) {
      path = parentPath + '.' + path;
    }

    return path;
  }).property().cacheable(),

  /**
    @private

    Override the default event firing from Ember.Evented to
    also call methods with the given name.
  */
  fire: function(name) {
    if (this[name]) {
      this[name].apply(this, [].slice.call(arguments, 1));
    }
    this._super.apply(this, arguments);
  },

  init: function() {
    var states = get(this, 'states'), foundStates;
    set(this, 'childStates', Ember.A());
    this.eventTransitions = this.eventTransitions || {};

    var name, value, transitionTarget;

    // As a convenience, loop over the properties
    // of this state and look for any that are other
    // Ember.State instances or classes, and move them
    // to the `states` hash. This avoids having to
    // create an explicit separate hash.

    if (!states) {
      states = {};

      for (name in this) {
        if (name === "constructor") { continue; }

        if (value = this[name]) {
          if (transitionTarget = value.transitionTarget) {
            this.eventTransitions[name] = transitionTarget;
          }

          this.setupChild(states, name, value);
        }
      }

      set(this, 'states', states);
    } else {
      for (name in states) {
        this.setupChild(states, name, states[name]);
      }
    }

    set(this, 'routes', {});
  },

  setupChild: function(states, name, value) {
    if (!value) { return false; }

    if (Ember.State.detect(value)) {
      value = value.create({
        name: name
      });
    } else if (value.isState) {
      set(value, 'name', name);
    }

    if (value.isState) {
      set(value, 'parentState', this);
      get(this, 'childStates').pushObject(value);
      states[name] = value;
    }
  },

  lookupEventTransition: function(name) {
    var path, state = this;

    while(state && !path) {
      path = state.eventTransitions[name];
      state = state.get('parentState');
    }

    return path;
  },

  /**
    A Boolean value indicating whether the state is a leaf state
    in the state hierarchy. This is false if the state has child
    states; otherwise it is true.

    @type Boolean
  */
  isLeaf: Ember.computed(function() {
    return !get(this, 'childStates').length;
  }).cacheable(),

  setup: Ember.K,
  enter: Ember.K,
  exit: Ember.K
});

Ember.State.transitionTo = function(target) {
  var event = function(router, event) {
    router.transitionTo(target, event.context);
  };

  event.transitionTarget = target;

  return event;
};
