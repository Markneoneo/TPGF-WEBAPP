import { application } from "./application"

import TestSettingsFormController from "./test_settings_form_controller"
import IpConfigurationController from "./ip_configuration_controller"
import ProductionParametersController from "./production_parameters_controller"
import CharzParametersController from "./charz_parameters_controller"
import CombinedSettingsController from "./combined_settings_controller"
import UiEnhancementsController from "./ui_enhancements_controller"
import ImportSettingsController from "./import_settings_controller"

application.register("test-settings-form", TestSettingsFormController)
application.register("ip-configuration", IpConfigurationController)
application.register("production-parameters", ProductionParametersController)
application.register("charz-parameters", CharzParametersController)
application.register("combined-settings", CombinedSettingsController)
application.register("ui-enhancements", UiEnhancementsController)
application.register("import-settings", ImportSettingsController)  
