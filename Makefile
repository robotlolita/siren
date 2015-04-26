bin = $(shell npm bin)
ometa = $(bin)/ometajs2js
sjs = $(bin)/sjs

# -- CONFIGURATION -----------------------------------------------------
LIB_DIR = lib
SRC_DIR = src
SRC = $(wildcard $(SRC_DIR)/*.sjs \
                 $(SRC_DIR)/**/*.sjs \
                 $(SRC_DIR)/**/**/*.sjs \
                 $(SRC_DIR)/*.ometajs \
                 $(SRC_DIR)/**/*.ometajs)
TGT = ${SRC:$(SRC_DIR)/%.sjs=$(LIB_DIR)/%.js} ${SRC:$(SRC_DIR)/%.ometajs=$(LIB_DIR)/%.js}


# -- COMPILATION -------------------------------------------------------
$(LIB_DIR)/%.js: $(SRC_DIR)/%.ometajs
	mkdir -p $(dir $@)
	$(ometa) --beautify < $< > $@

$(LIB_DIR)/%.js: $(SRC_DIR)/%.sjs
	mkdir -p $(dir $@)
	$(sjs) --readable-names \
	       --module lambda-chop/macros \
	       --module adt-simple/macros \
	       --module sparkler/macros \
	       --module es6-macros/macros/destructure \
	       --module macros.operators \
	       --output $@ \
	       $<

# -- TASKS -------------------------------------------------------------
compile: $(TGT)

clean:
	rm -rf $(LIB_DIR)

.PHONY: clean
