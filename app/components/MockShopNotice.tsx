export function MockShopNotice() {
  return (
    <section
      className="mock-shop-notice"
      aria-labelledby="mock-shop-notice-heading"
    >
      <div className="inner">
        <h2 id="mock-shop-notice-heading">The New Greenhouse</h2>
        <p>
          You&rsquo;re seeing sample products because no store is connected to
          this preview yet.
        </p>
        <p>Connect a Shopify store to load live inventory.</p>
      </div>
    </section>
  );
}
