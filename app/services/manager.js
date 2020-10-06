//----------------------------------------------------------------------------//
// Leopold Hock / 2020-08-22
// Description:
// Description: This is the central service for the entire application. The manager supplies the magnitude of utility
// functions that are not part of another independent service.
//----------------------------------------------------------------------------//
import Ember from 'ember';
import Service from '@ember/service';
import config from '../config/environment';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
var that;

export default class ManagerService extends Service {
    @service store;
    @service("constantService") constants;
    @service localizationService;
    @service messageService;
    @service("databaseService") database;
    @service("stellarpediaService") stellarpedia;
    @service router;
    @service modalService;
    @tracked config;

    // Input patterns
    @tracked pattern = {
        email: /(?!(^[.-].*|[^@]*[.-]@|.*\.{2,}.*)|^.{254}.)([a-zA-Z0-9!#$%&'*+\/=?^_`{|}~.-]+@)(?!-.*|.*-\.)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,15}/
    }

    // System Variables
    @tracked devMode = false;
    @tracked isMobile = false;
    @tracked msgType;

    init() {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Initializer method.
        //----------------------------------------------------------------------------//
        super.init();
        that = this;
        this.config = config;
        if (config.environment === "development") that.devMode = true;
        // subscribe to routeDidChange event
        that.router.on("routeDidChange", (transition) => {
            that.onTransition(transition);
        });
        that.renderNavbarMenu();
        that.log("Manager initialized.");
        that.msgType = that.messageService.msgType;
        // listen to media query event to keep isMobile property updated
        let mediaQuery = window.matchMedia("(max-width: 600px)");
        this.onMediaChange(mediaQuery);
        mediaQuery.addListener(that.onMediaChange);
    }

    @action
    test() {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Method for testing purposes only.
        //----------------------------------------------------------------------------//
        console.log("Testing...");
        console.log(that.manager.diesdas());
    }

    goToRoute(id) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Calls router to transition to a specific subroute of main (default routing).
        //----------------------------------------------------------------------------//
        that.router.transitionTo("main." + id);
    }

    onTransition(transition) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // This method is being called by the router after every transition.
        //----------------------------------------------------------------------------//
        that.renderNavbarMenu(transition);
    }

    renderNavbarMenu(transition) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // (Re-)Renders the nav-sidebar's content.
        //----------------------------------------------------------------------------//
        if (!that.router.currentRouteName) return;
        let currentRouteNameSplit = that.router.currentRouteName.split(".");
        if (currentRouteNameSplit.length > 1) {
            let combinedRouteName = currentRouteNameSplit[0] + "." + currentRouteNameSplit[1];
            // check whether this route has an own navbar template
            let navSidebarTemplate = Ember.getOwner(that).lookup("template:" + "nav-sidebar/" + currentRouteNameSplit[1]);
            let navSidebarController = Ember.getOwner(that).lookup("controller:" + "nav-sidebar/" + currentRouteNameSplit[1]);
            if (navSidebarTemplate && navSidebarController) {
                Ember.getOwner(that).lookup("route:" + combinedRouteName).render("nav-sidebar/" + currentRouteNameSplit[1], {
                    outlet: "navSidebarOutlet",
                    into: "main",
                    controller: "nav-sidebar/" + currentRouteNameSplit[1]
                });
            } else {
                // if none exists, render main navbar template
                Ember.getOwner(that).lookup("route:main").render("nav-sidebar/main", {
                    outlet: "navSidebarOutlet",
                    into: "main",
                    controller: "nav-sidebar/main"
                });
            }
        }
    }

    updateTabGroup(buttonGroupID, selectedID, classNameSelected) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Updates the nav-sidebar's tab group.
        //----------------------------------------------------------------------------//
        let buttonGroup = document.getElementById(buttonGroupID);
        if (!buttonGroup) {
            that.log("Unable to find control '" + buttonGroupID + "'.", this.manager.msgType.x);
            return;
        }
        for (var i = 0; i < buttonGroup.children.length; i++) {
            buttonGroup.children[i].classList.remove(classNameSelected);
        }
        document.getElementById(selectedID).classList.add(classNameSelected);
    }

    localize(key, allowUndefined = false) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Sends the input to the localizationService and returns its value.
        //----------------------------------------------------------------------------//
        return (that.localizationService.getValue(key, allowUndefined));
    }

    getIdentifiable(id) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Looks up the identifier with the databaseService and returns the result.
        //----------------------------------------------------------------------------//
        return that.database.getIdentifiable(id);
    }

    log(messageText, messageType = "info", showToUser = false) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Calls messageService to log a specific message.
        //----------------------------------------------------------------------------//
        that.messageService.logMessage(messageText, messageType);
    }

    prepareId(id) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Adjusts an identifier to match the serialized identifier schema.
        //----------------------------------------------------------------------------//
        id = Ember.String.dasherize(id);
        return id;
    }

    showStellarpediaEntry(bookId, chapterId, entryId) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-08-22
        // Description:
        // Calls stellarpediaService to show a specific Stellarpedia article.
        //----------------------------------------------------------------------------//
        that.router.transitionTo("main.stellarpedia", that.prepareId(bookId) + "+" + that.prepareId(chapterId) + "+" + that.prepareId(entryId));
    }

    onMediaChange(mediaQuery) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-09-09
        // Description:
        // Is being triggered on media screen width change. Sets isMobile property.
        //----------------------------------------------------------------------------//
        that.isMobile = mediaQuery.matches;
    }

    tryCloseSidebar(id) {
        //----------------------------------------------------------------------------//
        // Leopold Hockh / 2020-09-11
        // Description:
        // This method tries to close the specified sidebar.
        //----------------------------------------------------------------------------//
        let mainController = Ember.getOwner(that).lookup("controller:main");
        if (id === "accountSidebar") {
            if (mainController.accountSidebarExpanded) mainController.toggleSidebar("accountSidebar");
        } else {
            if (mainController.navSidebarExpanded) mainController.toggleSidebar("navSidebar");
        }
    }

    callModal(type, args, listeners) {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-09-19
        // Description:
        // Renders a specified modal.
        //----------------------------------------------------------------------------//
        that.modalService.render(type, args, listeners);
    }

    hideModal() {
        //----------------------------------------------------------------------------//
        // Leopold Hock / 2020-09-19
        // Description:
        // Hides the currently active modal.
        //----------------------------------------------------------------------------//
        that.modalService.hide();
    }
}