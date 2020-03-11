import { withRouter } from 'next/router';

const ActiveLink = ({ router, href, children }) => {

  // wrapped to make it immediately executed by making it an iffy
  (function prefetchPages() {
    // makes sure you don't prefetch if just grabbing pages on server for some reason
    if (typeof window !== "undefined") {
      router.prefetch(router.pathname);
    }
  })()

  const handleClick = event => {
    event.preventDefault();
    router.push(href);
  }

  const isCurrentPath = router.pathname === href || router.asPath === href;

  return (
    <div>
      {/* onClick prevents page reload */}
      <a href={href} onClick={handleClick}
        style={{
          textDecoration: 'none',
          margin: 0,
          padding: 0,
          fontWeight: isCurrentPath ? "bold" : "normal",
          color: isCurrentPath ? '#6B41A6' : "#8360A6"
        }}
      >
        { children }
      </a>
    </div>);
};

export default withRouter(ActiveLink);
