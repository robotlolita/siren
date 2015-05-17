bin = $(shell npm bin)
ometa = $(bin)/ometajs2js
sjs = $(bin)/sjs

# -- CONFIGURATION -----------------------------------------------------
LANG_TGT_DIR := lib
LANG_SRC_DIR := src
LANG_SRC := $(shell find $(LANG_SRC_DIR) -name '*.sjs') \
            $(shell find $(LANG_SRC_DIR) -name '*.ometajs')
LANG_TGT := ${LANG_SRC:$(LANG_SRC_DIR)/%.sjs=$(LANG_TGT_DIR)/%.js} \
            ${LANG_SRC:$(LANG_SRC_DIR)/%.ometajs=$(LANG_TGT_DIR)/%.js}

VM_TGT_DIR := vm
VM_SRC_DIR := vm
VM_SRC := $(shell find $(VM_SRC_DIR) -name '*.sjs')
VM_TGT := ${VM_SRC:$(VM_SRC_DIR)/%.sjs=$(VM_TGT_DIR)/%.js}


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


# -- TASKS -------------------------------------------------------------
language: $(LANG_TGT)

vm: $(VM_TGT)

all: vm language

clean:
	rm $(LANG_TGT) $(VM_TGT)

.PHONY: clean
