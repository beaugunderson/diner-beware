all: public/css/elements.css public/css/phone.css public/css/diner-beware.css

public/css/diner-beware.css: public/css/diner-beware.scss
	@echo "SASSing..."
	@sass public/css/diner-beware.scss > public/css/diner-beware.css

public/css/elements.css: public/css/elements.scss
	@echo "SASSing..."
	@sass public/css/elements.scss > public/css/elements.css

public/css/phone.css: public/css/phone.scss
	@echo "SASSing..."
	@sass public/css/phone.scss > public/css/phone.css
