//  Leopold Hock | 30.04.2020
//  Description: Controller for template "main/generator".

import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
var that;

export default class GeneratorController extends Controller {
    @service manager;
    @service databaseService;
    @service characterService;
    
    @tracked title = "";

    init() {
        super.init();
        that = this;
    }

    onTransition() {
        title = that.manager.localizationService.getValue("Misc_NewCharacter");
    }
}