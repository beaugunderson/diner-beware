all: public/css/phone.css

public/css/phone.css: public/css/phone.scss
	@echo "SASSing..."
	@sass public/css/phone.scss > public/css/phone.css
