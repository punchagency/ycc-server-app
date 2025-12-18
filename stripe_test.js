const StripeService = require("./dist/integration/stripe").default;

const testStripe = async () => {
    const stripeService = StripeService.getInstance();

    try {
        // Test 1: Get Invoice
        console.log('\n=== Testing Get Invoice ===');
        const invoice = await stripeService.getInvoice("in_1SffJECRJtBdC1TwOXiMmbMe");
        console.log('Invoice:', invoice);

        // Test 2: Create Customer
        console.log('\n=== Testing Create Customer ===');
        const customer = await stripeService.createCustomer({
            email: 'test@example.com',
            name: 'Test Customer',
            description: 'Test customer for Stripe integration'
        });
        console.log('Customer created:', customer.id);

        // Test 3: List Customers
        console.log('\n=== Testing List Customers ===');
        const customers = await stripeService.listCustomers({ email: 'test@example.com', limit: 10 });
        console.log('Customers found:', customers.data.length);

        // Test 4: Create Product
        console.log('\n=== Testing Create Product ===');
        const product = await stripeService.createProduct({
            name: 'Test Product',
            description: 'A test product for Stripe integration'
        });
        console.log('Product created:', product.id);

        // Test 5: Create Price
        console.log('\n=== Testing Create Price ===');
        const price = await stripeService.createPrice({
            productId: product.id,
            unitAmount: 2000 // $20.00
        });
        console.log('Price created:', price.id);

        // Test 6: Retrieve Account (if you have a connected account ID)
        // console.log('\n=== Testing Retrieve Account ===');
        // const account = await stripeService.retrieveAccount('acct_xxxxx');
        // console.log('Account:', account.id);

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

testStripe();