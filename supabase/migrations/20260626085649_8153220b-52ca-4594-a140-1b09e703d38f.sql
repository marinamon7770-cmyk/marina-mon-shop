
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 1 AND 100),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL CHECK (char_length(trim(text)) BETWEEN 3 AND 2000),
  photo_url text CHECK (photo_url IS NULL OR char_length(photo_url) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  source text NOT NULL DEFAULT 'site' CHECK (source IN ('site','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_product_status_idx ON public.reviews(product_id, status, created_at DESC);
CREATE INDEX reviews_status_idx ON public.reviews(status, created_at DESC);

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Все видят только одобренные
CREATE POLICY "Public can read approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

-- Админ видит всё
CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- Гости могут создавать отзыв только со статусом pending и source='site'
CREATE POLICY "Anyone can submit a review for moderation"
  ON public.reviews FOR INSERT
  WITH CHECK (status = 'pending' AND source = 'site');

-- Админ может обновлять и удалять
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
