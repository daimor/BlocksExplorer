Class Blocks.SessionHandler extends %CSP.SessionEvents
{

ClassMethod OnStartSession()
{
  try {
    s x=$system.License.PublicWebAppUser()
  } catch { }
  q $$$OK
}

}