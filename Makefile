bin = $(shell npm bin)
ometa = $(bin)/ometajs2js
sjs = $(bin)/sjs

# -- CONFIGURATION -----------------------------------------------------
LANG_TGT_DIR := lib
LANG_SRC_DIR := src
LANG_SRC_SJS := $(shell find $(LANG_SRC_DIR)/ -name '*.sjs')
LANG_SRC_OMETA := $(shell find $(LANG_SRC_DIR)/ -name '*.ometajs')
LANG_TGT := ${LANG_SRC_SJS:$(LANG_SRC_DIR)/%.sjs=$(LANG_TGT_DIR)/%.js} \
            ${LANG_SRC_OMETA:$(LANG_SRC_DIR)/%.ometajs=$(LANG_TGT_DIR)/%.js}

VM_TGT_DIR := vm
VM_SRC_DIR := vm
VM_SRC := $(shell find $(VM_SRC_DIR)/ -name '*.sjs')
VM_TGT := ${VM_SRC:$(VM_SRC_DIR)/%.sjs=$(VM_TGT_DIR)/%.js}

RT_TGT_DIR := runtime
RT_SRC_DIR := runtime/src
RT_SRC := $(shell find $(RT_SRC_DIR)/ -name '*.maid')
RT_TGT := ${RT_SRC:$(RT_SRC_DIR)/%.maid=$(RT_TGT_DIR)/%.js}


# -- COMPILATION -------------------------------------------------------
$(LANG_TGT_DIR)/%.js: $(LANG_SRC_DIR)/%.ometajs
	mkdir -p $(dir $@)
	$(ometa) --beautify < $< > $@

$(LANG_TGT_DIR)/%.js: $(LANG_SRC_DIR)/%.sjs
	mkdir -p $(dir $@)
	$(sjs) --readable-names \
	       --module lambda-chop/macros \
	       --module adt-simple/macros \
	       --module sparkler/macros \
	       --module es6-macros/macros/destructure \
	       --module macros.operators \
	       --output $@ \
	       $<

$(VM_TGT_DIR)/%.js: $(VM_SRC_DIR)/%.sjs
	$(sjs) --readable-names \
	       --module lambda-chop/macros \
	       --module adt-simple/macros \
	       --module sparkler/macros \
	       --module es6-macros/macros/destructure \
	       --module macros.operators \
	       --output $@ \
	       $<

$(RT_TGT_DIR)/%.js: $(RT_SRC_DIR)/%.siren
	mkdir -p $(dir $@)
	bin/siren -c $< > $@

# -- TASKS -------------------------------------------------------------
node_modules: package.json
	npm install

language: $(LANG_TGT)

vm: $(VM_TGT)

runtime: $(RT_TGT)

all: node_modules vm language runtime

clean-vm:
	rm -f $(VM_TGT)

clean-language:
	rm -f $(LANG_TGT)

clean-runtime:
	rm -f $(RT_TGT)

clean:
	rm -rf node_modules
	rm -f $(VM_TGT) $(LANG_TGT) $(RT_TGT)

.PHONY: clean
