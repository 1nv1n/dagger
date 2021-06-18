/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { MDXProvider } from '@mdx-js/react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import renderRoutes from '@docusaurus/renderRoutes';
import Layout from '@theme/Layout';
import DocSidebar from '@theme/DocSidebar';
import MDXComponents from '@theme/MDXComponents';
import NotFound from '@theme/NotFound';
import IconArrow from '@theme/IconArrow';
import { matchPath } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import clsx from 'clsx';
import styles from './styles.module.css';
import { ThemeClassNames, docVersionSearchTag } from '@docusaurus/theme-common';
import { Redirect } from "react-router";
import qs from 'querystringify';
import isEmpty from 'lodash/isEmpty';
import { checkUserCollaboratorStatus } from '../../api/github'
import { GithubLoginButton } from 'react-social-login-buttons';
import Spinner from '../../components/Spinner';
import DocPageAuthentication from '../../components/DocPageAuthentication';
import DocPageRedirect from '../../components/DocPageRedirect';

function DocPageContent({ currentDocRoute, versionMetadata, children }) {
  const { siteConfig, isClient } = useDocusaurusContext();
  const { pluginId, permalinkToSidebar, docsSidebars, version } = versionMetadata;
  const sidebarName = permalinkToSidebar[currentDocRoute.path];
  const sidebar = docsSidebars[sidebarName];
  const [hiddenSidebarContainer, setHiddenSidebarContainer] = useState(false);
  const [hiddenSidebar, setHiddenSidebar] = useState(false);
  const toggleSidebar = useCallback(() => {
    if (hiddenSidebar) {
      setHiddenSidebar(false);
    }

    setHiddenSidebarContainer(!hiddenSidebarContainer);
  }, [hiddenSidebar]);
  return (
    <Layout
      key={isClient}
      wrapperClassName={ThemeClassNames.wrapper.docPages}
      pageClassName={ThemeClassNames.page.docPage}
      searchMetadatas={{
        version,
        tag: docVersionSearchTag(pluginId, version),
      }}>
      <div className={styles.docPage}>
        {sidebar && (
          <div
            className={clsx(styles.docSidebarContainer, {
              [styles.docSidebarContainerHidden]: hiddenSidebarContainer,
            })}
            onTransitionEnd={(e) => {
              if (
                !e.currentTarget.classList.contains(styles.docSidebarContainer)
              ) {
                return;
              }

              if (hiddenSidebarContainer) {
                setHiddenSidebar(true);
              }
            }}
            role="complementary">
            <DocSidebar
              key={
                // Reset sidebar state on sidebar changes
                // See https://github.com/facebook/docusaurus/issues/3414
                sidebarName
              }
              sidebar={sidebar}
              path={currentDocRoute.path}
              sidebarCollapsible={
                siteConfig.themeConfig?.sidebarCollapsible ?? true
              }
              onCollapse={toggleSidebar}
              isHidden={hiddenSidebar}
            />

            {hiddenSidebar && (
              <div
                className={styles.collapsedDocSidebar}
                title={translate({
                  id: 'theme.docs.sidebar.expandButtonTitle',
                  message: 'Expand sidebar',
                  description:
                    'The ARIA label and title attribute for expand button of doc sidebar',
                })}
                aria-label={translate({
                  id: 'theme.docs.sidebar.expandButtonAriaLabel',
                  message: 'Expand sidebar',
                  description:
                    'The ARIA label and title attribute for expand button of doc sidebar',
                })}
                tabIndex={0}
                role="button"
                onKeyDown={toggleSidebar}
                onClick={toggleSidebar}>
                <IconArrow className={styles.expandSidebarButtonIcon} />
              </div>
            )}
          </div>
        )}
        <main
          className={clsx(styles.docMainContainer, {
            [styles.docMainContainerEnhanced]:
              hiddenSidebarContainer || !sidebar,
          })}>
          <div
            className={clsx(
              'container padding-vert--lg',
              styles.docItemWrapper,
              {
                [styles.docItemWrapperEnhanced]: hiddenSidebarContainer,
              },
            )}>
            <MDXProvider components={MDXComponents}>{children}</MDXProvider>
          </div>
        </main>
      </div>
    </Layout>
  );
}

function DocPage(props) {
  const {
    route: { routes: docRoutes },
    versionMetadata,
    location,
  } = props;
  const currentDocRoute = docRoutes.find((docRoute) =>
    matchPath(location.pathname, docRoute),
  );

  // CUSTOM DOCPAGE
  if (process.env.REACT_APP_OAUTH_ENABLE == 'true') {
    const [isUserAuthorized, setIsUserAuthorized] = useState()
    const [isLoading, setIsLoading] = useState(true)
    const [redirectState, setRedirectState] = useState()
    const authQuery = qs.parse(location.search);
    const [userAccessStatus, setUserAccessStatus] = useState((() => {
      if (typeof window !== "undefined") return window.localStorage.getItem('user-github-isAllowed')
    })())

    useEffect(async () => {
      if (userAccessStatus) {
        setIsUserAuthorized(userAccessStatus)
      } else {
        if (!isEmpty(authQuery)) { //callback after successful auth with github
          const isUserCollaborator = await checkUserCollaboratorStatus(authQuery.code);
          if (isUserCollaborator?.isAllowed) {
            setUserAccessStatus(isUserCollaborator?.isAllowed)
            if (typeof window !== "undefined") window.localStorage.setItem('user-github-isAllowed', isUserCollaborator?.isAllowed);
          }

          setIsUserAuthorized(isUserCollaborator?.isAllowed)
        }
      }
      setIsLoading(false)
    }, [userAccessStatus])


    if (isLoading) return <Spinner />

    if (isUserAuthorized === false) {
      return <DocPageRedirect />
    }

    if (typeof isUserAuthorized == 'undefined' || isUserAuthorized?.status === 401) {
      return (
        <DocPageAuthentication />
      )
    }
  }
  // END CUSTOM DOCPAGE

  if (!currentDocRoute) {
    return <NotFound {...props} />;
  }

  return (
    <DocPageContent
      currentDocRoute={currentDocRoute}
      versionMetadata={versionMetadata}>
      {renderRoutes(docRoutes)}
    </DocPageContent>
  );
}

export default DocPage;
