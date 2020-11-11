// @flow

export function slackAuth(
  state: string,
  scopes: string[] = [
    "identity.email",
    "identity.basic",
    "identity.avatar",
    "identity.team",
  ],
  clientId: string = process.env.SLACK_KEY,
  redirectUri: string = `${process.env.URL}/auth/slack.callback`
): string {
  const baseUrl = "https://slack.com/oauth/authorize";
  const params = {
    client_id: clientId,
    scope: scopes ? scopes.join(" ") : "",
    redirect_uri: redirectUri,
    state,
  };

  const urlParams = Object.keys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${baseUrl}?${urlParams}`;
}

export function githubUrl(): string {
  return "https://www.github.com/KOJI-SAS/koji-documentation-editor";
}

export function githubIssuesUrl(): string {
  return "https://www.github.com/KOJI-SAS/koji-documentation-editor/issues";
}

export function signin(service: string = "slack"): string {
  return `${process.env.URL}/auth/${service}`;
}

export function settings(): string {
  return `/settings`;
}

export function groupSettings(): string {
  return `/settings/groups`;
}
