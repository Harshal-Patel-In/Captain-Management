-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alembic_version (
  version_num character varying NOT NULL,
  CONSTRAINT alembic_version_pkey PRIMARY KEY (version_num)
);
CREATE TABLE public.delivery_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL,
  delivered_quantity integer NOT NULL CHECK (delivered_quantity > 0),
  delivered_by uuid,
  remarks text,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delivery_logs_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_logs_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.ecommerce_order_items(id)
);
CREATE TABLE public.ecommerce_order_items (
  id uuid NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  delivered_quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT ecommerce_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT ecommerce_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.ecommerce_orders(id),
  CONSTRAINT ecommerce_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecommerce_products(id)
);
CREATE TABLE public.ecommerce_orders (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  payment_status USER-DEFINED NOT NULL,
  total_amount numeric NOT NULL,
  amount_paid numeric NOT NULL,
  shipping_address jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  payment_deadline timestamp with time zone,
  CONSTRAINT ecommerce_orders_pkey PRIMARY KEY (id),
  CONSTRAINT ecommerce_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.ecommerce_users(id)
);
CREATE TABLE public.ecommerce_products (
  id uuid NOT NULL,
  sku character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  category character varying NOT NULL,
  price numeric NOT NULL,
  stock_quantity integer NOT NULL,
  low_stock_threshold integer NOT NULL,
  unit_of_measure character varying NOT NULL,
  pack_size character varying,
  weight double precision,
  dimensions character varying,
  images jsonb,
  is_active boolean NOT NULL,
  source_product_id integer,
  CONSTRAINT ecommerce_products_pkey PRIMARY KEY (id),
  CONSTRAINT ecommerce_products_source_product_id_fkey FOREIGN KEY (source_product_id) REFERENCES public.products(id)
);
CREATE TABLE public.ecommerce_users (
  id uuid NOT NULL,
  full_name character varying,
  email character varying NOT NULL,
  phone_number character varying UNIQUE,
  address_line1 character varying,
  address_line2 character varying,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  is_active boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  password_hash character varying,
  is_verified boolean NOT NULL DEFAULT false,
  verification_token character varying,
  verification_token_expires timestamp with time zone,
  is_onboarding_completed boolean NOT NULL DEFAULT false,
  CONSTRAINT ecommerce_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory (
  id integer NOT NULL DEFAULT nextval('inventory_id_seq'::regclass),
  product_id integer NOT NULL UNIQUE,
  quantity double precision NOT NULL CHECK (quantity >= 0::double precision),
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text,
  order_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.ecommerce_users(id),
  CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.ecommerce_orders(id)
);
CREATE TABLE public.order_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  action USER-DEFINED NOT NULL,
  performed_by uuid,
  previous_state jsonb,
  new_state jsonb,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.ecommerce_orders(id)
);
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.ecommerce_users(id)
);
CREATE TABLE public.payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  amount_paid numeric NOT NULL CHECK (amount_paid > 0::numeric),
  payment_method character varying NOT NULL,
  remarks text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT payment_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.ecommerce_orders(id)
);
CREATE TABLE public.products (
  id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  name character varying NOT NULL,
  category character varying,
  qr_code_value character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  unit_type USER-DEFINED NOT NULL DEFAULT 'piece'::unittype,
  unit_label USER-DEFINED NOT NULL DEFAULT 'pcs'::unitlabel,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recipes (
  id integer NOT NULL DEFAULT nextval('recipes_id_seq'::regclass),
  product_id integer NOT NULL,
  ingredient_id integer NOT NULL,
  quantity double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.products(id),
  CONSTRAINT recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.stock_logs (
  id integer NOT NULL DEFAULT nextval('stock_logs_id_seq'::regclass),
  product_id integer NOT NULL,
  action USER-DEFINED NOT NULL,
  quantity double precision NOT NULL CHECK (quantity > 0::double precision),
  previous_quantity double precision NOT NULL,
  new_quantity double precision NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  remarks character varying,
  reference_order_id uuid,
  reference_order_item_id uuid,
  CONSTRAINT stock_logs_pkey PRIMARY KEY (id),
  CONSTRAINT stock_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT stock_logs_reference_order_id_fkey FOREIGN KEY (reference_order_id) REFERENCES public.ecommerce_orders(id),
  CONSTRAINT stock_logs_reference_order_item_id_fkey FOREIGN KEY (reference_order_item_id) REFERENCES public.ecommerce_order_items(id)
);