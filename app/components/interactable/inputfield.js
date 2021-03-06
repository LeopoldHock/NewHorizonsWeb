//  Leopold Hock | 18.06.2020
//  Description: Controller for component 'Interactable::Inputfield'.
import InteractableComponent from './interactable';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class InputfieldComponent extends InteractableComponent {
    @service manager;
    @tracked value;
    @tracked valueSuffix;
    @tracked valueCombined;

    init() {
        super.init()
    }

    // internal event that handles value change
    @action onValueChange(item) {

        // try to call onChange(itemID, index)
        try {
            this.onChange(this.get("selectedId"), this.get("selectedIndex"));
        } catch (e) {
            this.manager.log("error", "Calling onChange(itemID, index) from input-field component has failed because method has not been subscribed in parent template.");
        }
    }

    // update inputfield state internally
    @action update() {
    }
}