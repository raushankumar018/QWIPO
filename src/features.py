import pandas as pd
import scipy.sparse as sps

def load_and_transform_data(orders_cursor, products_cursor):
    # Flatten the orders data
    transactions_list = []
    for order in orders_cursor:
        retailer_id_str = str(order['retailer'])
        for item in order.get('products', []):
            transactions_list.append({
                'retailer_id': retailer_id_str,
                'product_id': str(item['product']),
                'quantity': item['quantity']
            })
    
    orders_df = pd.DataFrame(transactions_list)
    products_df = pd.DataFrame(list(products_cursor))
    products_df['product_id'] = products_df['_id'].astype(str)

    return orders_df, products_df

def build_id_maps(orders_df):
    retailers = orders_df['retailer_id'].unique().tolist()
    products = orders_df['product_id'].unique().tolist()
    u2idx = {u: i for i, u in enumerate(retailers)}
    i2idx = {p: i for i, p in enumerate(products)}
    return u2idx, i2idx, retailers, products

def build_item_user_matrix(orders_df, u2idx, i2idx):
    rows = orders_df['product_id'].map(i2idx).values
    cols = orders_df['retailer_id'].map(u2idx).values
    data = orders_df['quantity'].values
    num_items = len(i2idx)
    num_users = len(u2idx)
    m = sps.csc_matrix((data, (rows, cols)), shape=(num_items, num_users))
    return m

def get_user_purchased_items(user_id, orders_df):
    purchased_items = orders_df[orders_df['retailer_id'] == user_id]['product_id'].unique().tolist()
    return purchased_items

def get_user_purchased_categories(user_id, orders_df, products_df):
    purchased_product_ids = get_user_purchased_items(user_id, orders_df)
    purchased_categories = products_df[products_df['product_id'].isin(purchased_product_ids)]['category'].unique().tolist()
    return purchased_categories