import React from "react";
import { connect } from "react-redux";
import { submit } from "redux-form";
import RestApiEditorForm from "./RestAPIForm";
import RapidApiEditorForm from "./RapidApiEditorForm";
import type { AppState } from "@appsmith/reducers";
import type { RouteComponentProps } from "react-router";
import type {
  ActionData,
  ActionDataState,
} from "@appsmith/reducers/entityReducers/actionsReducer";
import _ from "lodash";
import { getCurrentApplication } from "@appsmith/selectors/applicationSelectors";
import {
  getActionById,
  getCurrentApplicationId,
  getCurrentPageName,
} from "selectors/editorSelectors";
import type { Plugin } from "api/PluginApi";
import type { Action, PaginationType, RapidApiAction } from "entities/Action";
import { PluginPackageName } from "entities/Action";
import { getApiName } from "selectors/formSelectors";
import Spinner from "components/editorComponents/Spinner";
import type { CSSProperties } from "styled-components";
import styled from "styled-components";
import CenteredWrapper from "components/designSystems/appsmith/CenteredWrapper";
import { changeApi } from "actions/apiPaneActions";
import PerformanceTracker, {
  PerformanceTransactionName,
} from "utils/PerformanceTracker";
import * as Sentry from "@sentry/react";
import EntityNotFoundPane from "pages/Editor/EntityNotFoundPane";
import type { ApplicationPayload } from "@appsmith/constants/ReduxActionConstants";
import { getPageList, getPlugins } from "@appsmith/selectors/entitiesSelector";
import history from "utils/history";
import { saasEditorApiIdURL } from "@appsmith/RouteBuilder";
import GraphQLEditorForm from "./GraphQL/GraphQLEditorForm";
import type { APIEditorRouteParams } from "constants/routes";
import { ApiEditorContext } from "./ApiEditorContext";

const LoadingContainer = styled(CenteredWrapper)`
  height: 50%;
`;

interface ReduxStateProps {
  actions: ActionDataState;
  isRunning: boolean;
  isDeleting: boolean;
  isCreating: boolean;
  apiName: string;
  currentApplication?: ApplicationPayload;
  currentPageName: string | undefined;
  pages: any;
  plugins: Plugin[];
  pluginId: any;
  apiAction: Action | ActionData | RapidApiAction | undefined;
  paginationType: PaginationType;
  applicationId: string;
}

interface OwnProps {
  isEditorInitialized: boolean;
}

interface ReduxActionProps {
  submitForm: (name: string) => void;
  changeAPIPage: (apiId: string, isSaas: boolean) => void;
}

function getPackageNameFromPluginId(pluginId: string, plugins: Plugin[]) {
  const plugin = plugins.find((plugin: Plugin) => plugin.id === pluginId);
  return plugin?.packageName;
}

type Props = ReduxActionProps &
  ReduxStateProps &
  RouteComponentProps<APIEditorRouteParams> &
  OwnProps;

class ApiEditor extends React.Component<Props> {
  static contextType = ApiEditorContext;
  context!: React.ContextType<typeof ApiEditorContext>;

  componentDidMount() {
    PerformanceTracker.stopTracking(PerformanceTransactionName.OPEN_ACTION, {
      actionType: "API",
    });
    const type = this.getFormName();
    if (this.props.match.params.apiId) {
      this.props.changeAPIPage(this.props.match.params.apiId, type === "SAAS");
    }
  }

  getFormName = () => {
    const plugins = this.props.plugins;
    const pluginId = this.props.pluginId;
    const plugin =
      plugins &&
      plugins.find((plug) => {
        if (plug.id === pluginId) return plug;
      });
    return plugin && plugin.type;
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.isRunning && !this.props.isRunning) {
      PerformanceTracker.stopTracking(PerformanceTransactionName.RUN_API_CLICK);
    }
    if (prevProps.match.params.apiId !== this.props.match.params.apiId) {
      const type = this.getFormName();
      this.props.changeAPIPage(
        this.props.match.params.apiId || "",
        type === "SAAS",
      );
    }
  }

  getPluginUiComponentOfId = (
    id: string,
    plugins: Plugin[],
  ): string | undefined => {
    const plugin = plugins.find((plugin) => plugin.id === id);
    if (!plugin) return undefined;
    return plugin.uiComponent;
  };

  getPluginUiComponentOfName = (plugins: Plugin[]): string | undefined => {
    const plugin = plugins.find(
      (plugin) => plugin.packageName === PluginPackageName.REST_API,
    );
    if (!plugin) return undefined;
    return plugin.uiComponent;
  };

  render() {
    const {
      isCreating,
      isDeleting,
      isEditorInitialized,
      isRunning,
      match: {
        params: { apiId },
      },
      paginationType,
      pluginId,
      plugins,
    } = this.props;
    if (!pluginId && apiId) {
      return <EntityNotFoundPane />;
    }
    if (isCreating || !isEditorInitialized) {
      return (
        <LoadingContainer>
          <Spinner size={30} />
        </LoadingContainer>
      );
    }

    let formUiComponent: string | undefined;
    if (apiId) {
      if (pluginId) {
        formUiComponent = this.getPluginUiComponentOfId(pluginId, plugins);
      } else {
        formUiComponent = this.getPluginUiComponentOfName(plugins);
      }
    }

    return (
      <div style={formStyles}>
        {formUiComponent === "ApiEditorForm" && (
          <RestApiEditorForm
            apiName={this.props.apiName}
            appName={
              this.props.currentApplication
                ? this.props.currentApplication.name
                : ""
            }
            isDeleting={isDeleting}
            isRunning={isRunning}
            onDeleteClick={this.context.handleDeleteClick}
            onRunClick={this.context.handleRunClick}
            paginationType={paginationType}
            pluginId={pluginId}
            settingsConfig={this.context.settingsConfig}
          />
        )}
        {formUiComponent === "GraphQLEditorForm" && (
          <GraphQLEditorForm
            apiName={this.props.apiName}
            appName={
              this.props.currentApplication
                ? this.props.currentApplication.name
                : ""
            }
            isDeleting={isDeleting}
            isRunning={isRunning}
            match={this.props.match}
            onDeleteClick={this.context.handleDeleteClick}
            onRunClick={this.context.handleRunClick}
            paginationType={paginationType}
            pluginId={pluginId}
            settingsConfig={this.context.settingsConfig}
          />
        )}
        {formUiComponent === "RapidApiEditorForm" && (
          <RapidApiEditorForm
            apiId={this.props.match.params.apiId || ""}
            apiName={this.props.apiName}
            appName={
              this.props.currentApplication
                ? this.props.currentApplication.name
                : ""
            }
            isDeleting={isDeleting}
            isRunning={isRunning}
            location={this.props.location}
            onDeleteClick={this.context.handleDeleteClick}
            onRunClick={this.context.handleRunClick}
            paginationType={paginationType}
          />
        )}
        {formUiComponent === "SaaSEditorForm" &&
          history.push(
            saasEditorApiIdURL({
              pageId: this.props.match.params.pageId,
              pluginPackageName:
                getPackageNameFromPluginId(
                  this.props.pluginId,
                  this.props.plugins,
                ) ?? "",
              apiId: this.props.match.params.apiId || "",
            }),
          )}
      </div>
    );
  }
}

const formStyles: CSSProperties = {
  position: "relative",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const mapStateToProps = (state: AppState, props: any): ReduxStateProps => {
  const apiAction = getActionById(state, props);
  const apiName = getApiName(state, props.match.params.apiId);
  const { isCreating, isDeleting, isRunning } = state.ui.apiPane;
  const pluginId = _.get(apiAction, "pluginId", "");
  return {
    actions: state.entities.actions,
    currentApplication: getCurrentApplication(state),
    currentPageName: getCurrentPageName(state),
    pages: getPageList(state),
    apiName: apiName || "",
    plugins: getPlugins(state),
    pluginId,
    paginationType: _.get(apiAction, "actionConfiguration.paginationType"),
    apiAction,
    isRunning: isRunning[props.match.params.apiId],
    isDeleting: isDeleting[props.match.params.apiId],
    isCreating: isCreating,
    applicationId: getCurrentApplicationId(state),
  };
};

const mapDispatchToProps = (dispatch: any): ReduxActionProps => ({
  submitForm: (name: string) => dispatch(submit(name)),
  changeAPIPage: (actionId: string, isSaas: boolean) =>
    dispatch(changeApi(actionId, isSaas)),
});

export default Sentry.withProfiler(
  connect(mapStateToProps, mapDispatchToProps)(ApiEditor),
);